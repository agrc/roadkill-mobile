#!/usr/bin/env python
# * coding: utf8 *
'''
RoadkillPallet.py

A module that contains a pallet definition for roadkill apps (desktop & mobile)
Updates fields with empty values for:
-UserName, Agency & Email
-Calculate nearest milepost (Route 40, Milepost 101)
-nearest Road
-UDOT region
-UDWR region
-WMU region
'''

from os.path import join

import arcpy
import requests
import roadkill_secrets
from forklift.models import Pallet

# Reports fields
fldRESPONDER_EMAIL = 'RESPONDER_EMAIL'
fldRESPONDER_AGENCY = 'RESPONDER_AGENCY'
fldRESPONDER_NAME = 'RESPONDER_NAME'
fldRESPONDER_ID = 'RESPONDER_ID'
fldOBJECTID = 'OBJECTID'
fldUDOT_REGION = 'UDOT_REGION'
fldUDWR_REGION = 'UDWR_REGION'
fldHIGHWAY_ROAD = 'HIGHWAY_ROAD'
fldROUTE = 'ROUTE'
fldROUTE_DIR = 'ROUTE_DIR'
fldMILEPOST = 'MILEPOST'
fldWMU = 'WMU'

fldTARGET_FID = 'TARGET_FID'

# UDOT_Regions fields
fldREGION = 'REGION'

# UDWR_Regions fields
fldNAME = 'NAME'

# Roads fields
fldFULLNAME = 'FULLNAME'
fldALIAS1 = 'ALIAS1'

# Milepost fields
fldMP = 'MP'
fldRT_NAME = 'RT_NAME'
fldRT_DIR = 'RT_DIR'

# WMU fields
fldUnit_sub = 'Unit_sub'


class RoadkillPallet(Pallet):
    def __init__(self):
        super(RoadkillPallet, self).__init__()

        self.arcgis_services = [('Roadkill/Overlays', 'MapServer')]
        self.cached_requires_processing = None

    def build(self, target):
        self.target = target
        databases = {'Production': 'Roadkill_PROD as RKAdmin.sde',
                     'Staging': 'Roadkill_STAGE as RKAdmin.sde'}

        self.sgid = join(self.garage, 'SGID10.sde')
        self.roadkill = join(self.garage, databases[target])
        self.transportation = join(self.staging_rack, 'transportation.gdb')

        self.reports = join(self.roadkill, 'Roadkill.RKADMIN.Reports')

        self.add_crates(['UDOTMileposts', 'UDOTRoutes_LRS'],
                        {'source_workspace': self.sgid, 'destination_workspace': self.transportation})

        self.copy_data = [self.transportation]

    def requires_processing(self):
        if self.cached_requires_processing is None:
            lyr = arcpy.MakeFeatureLayer_management(self.reports, 'roadkill_requires_processing_layer', '{} IS NULL'.format(fldRESPONDER_EMAIL))
            count = int(arcpy.GetCount_management(lyr).getOutput(0))

            self.cached_requires_processing = count > 0

        return self.cached_requires_processing

    def process(self):
        udot = join(self.roadkill, 'Roadkill.RKADMIN.UDOT_Regions')
        udwr = join(self.roadkill, 'Roadkill.RKADMIN.UDWR_Regions')
        wmu = join(self.roadkill, 'Roadkill.RKADMIN.WMU_Regions')
        roads = join(self.sgid, 'SGID10.TRANSPORTATION.Roads')
        mileposts = join(self.sgid, 'SGID10.TRANSPORTATION.UDOTMileposts')

        udotjoined = r'{}\udotjoined'.format(arcpy.env.scratchGDB)
        udwrjoined = r'{}\udwrjoined'.format(arcpy.env.scratchGDB)
        wmujoined = r'{}\wmujoined'.format(arcpy.env.scratchGDB)
        roadsjoined = r'{}\roadsjoined'.format(arcpy.env.scratchGDB)
        milepostsjoined = r'{}\milepostsjoined'.format(arcpy.env.scratchGDB)
        reportsLayer = 'reportsLayer'

        ravenDbQueryUrl = r'http://{}:8079/databases/app_roadkill/indexes/UserByEmailIndex?&pageSize=1000'.format(roadkill_secrets.WEB_SERVER_IP[self.target])

        errors = []

        def delete_if_exists(paths):
            for path in paths:
                if arcpy.Exists(path):
                    arcpy.Delete_management(path)

        # deleting previous temp data
        delete_if_exists([udotjoined, udwrjoined, roadsjoined, milepostsjoined, wmujoined])

        self.log.info('building users dictionary')
        users = {}
        results = requests.get(ravenDbQueryUrl).json()['Results']
        for row in results:
            users[str(row['UserId'])] = {'email': row['Email'], 'name': row['FullName'], 'agency': row['Agency']}

        self.log.info('looping through roadkill reports')
        query = "{0} IS NOT NULL AND ({1} IS NULL OR {1} IN ('', ' '))".format(fldRESPONDER_ID, fldRESPONDER_NAME)
        cur = arcpy.UpdateCursor(self.reports, query)
        for f in cur:
            userid = f.getValue(fldRESPONDER_ID)[1:-1].lower()
            try:
                f.setValue(fldRESPONDER_AGENCY, users[userid]['agency'])
                f.setValue(fldRESPONDER_NAME, users[userid]['name'])
                f.setValue(fldRESPONDER_EMAIL, users[userid]['email'])
                cur.updateRow(f)
            except KeyError:
                msg = 'key error with {}'.format(userid)
                self.log.error(msg)
                errors.append(msg)

        def getNearest(overlayFC, joinedOutput, reportsField, overlayField):
            delete_if_exists([reportsLayer])
            self.log.info('calculating {}'.format(reportsField))
            arcpy.MakeFeatureLayer_management(self.reports, reportsLayer)
            arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(reportsField))
            self.log.info(arcpy.GetCount_management(reportsLayer).getOutput(0))
            self.log.info('spatial joining...')
            arcpy.SpatialJoin_analysis(reportsLayer, overlayFC, joinedOutput, "#", "KEEP_COMMON", "#", "CLOSEST", 100)
            self.log.info('adding join...')
            arcpy.AddJoin_management(reportsLayer, fldOBJECTID, joinedOutput, fldTARGET_FID)
            self.log.info(arcpy.GetCount_management(reportsLayer).getOutput(0))
            self.log.info('calcing field...')
            arcpy.CalculateField_management(reportsLayer, reportsField,
                                            '!{}.{}!'.format(joinedOutput.split('\\')[-1], overlayField),
                                            "PYTHON")

        getNearest(udot, udotjoined, fldUDOT_REGION, fldREGION)
        getNearest(udwr, udwrjoined, fldUDWR_REGION, fldNAME)
        getNearest(wmu, wmujoined, fldWMU, fldUnit_sub)

        self.log.info('calculating {0}'.format(fldROUTE))
        delete_if_exists([reportsLayer])
        arcpy.MakeFeatureLayer_management(self.reports, reportsLayer)
        arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(fldROUTE))
        arcpy.SpatialJoin_analysis(reportsLayer, mileposts, milepostsjoined, '#', 'KEEP_COMMON', '#', 'CLOSEST', 5280)  # search for points within a mile
        arcpy.AddJoin_management(reportsLayer, fldOBJECTID, milepostsjoined, fldTARGET_FID)
        mp = milepostsjoined.split('\\')[-1]
        arcpy.CalculateField_management(reportsLayer, fldROUTE,
                                        '!{}.{}!'.format(mp, fldRT_NAME),
                                        'PYTHON')
        arcpy.CalculateField_management(reportsLayer, fldROUTE_DIR,
                                        '!{}.{}!'.format(mp, fldRT_DIR),
                                        'PYTHON')
        arcpy.CalculateField_management(reportsLayer, fldMILEPOST,
                                        '!{}.{}!'.format(mp, fldMP),
                                        'PYTHON')
        delete_if_exists([reportsLayer])

        self.log.info('calculating {}'.format(fldHIGHWAY_ROAD))
        arcpy.MakeFeatureLayer_management(self.reports, reportsLayer)
        arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(fldHIGHWAY_ROAD))
        arcpy.SpatialJoin_analysis(reportsLayer, roads, roadsjoined, '#', 'KEEP_COMMON', '#', 'CLOSEST', 100)
        arcpy.AddJoin_management(reportsLayer, fldOBJECTID, roadsjoined, fldTARGET_FID)
        arcpy.CalculateField_management(reportsLayer, fldHIGHWAY_ROAD,
                                        '!{}.{}!'.format(roadsjoined.split('\\')[-1], fldFULLNAME),
                                        "PYTHON")
        delete_if_exists([reportsLayer])

        if len(errors):
            raise Exception('Key Errors: {}'.format(', '.join(errors)))
