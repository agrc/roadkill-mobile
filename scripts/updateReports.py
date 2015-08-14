"""
Updates fields with empty values for:
-UserName, Agency & Email
-Calculate nearest milepost (Route 40, Milepost 101)
-nearest Road
-UDOT region
-UDWR region
-WMU region

Runs nightly
Requires _mssql. You can run pymssql-2.0.0b1.win32-py2.6.exe to install it. Because of Esri's weird
install of Python you need to install the 32 bit version even if you are on a 64 bit system.

Built by Scott | 6-12-12

Updated Feb 2014 to incorporate new permissionsproxy project and schema change request from Frank P. at UDOT.
"""

import arcpy, requests
from agrc import messaging, logging, arcpy_helpers

arcpy.env.workspace = r'C:\PythonScripts\DatabaseConnections\Roadkill_PROD as RKAdmin.sde'
reports = 'RoadKill.RKADMIN.Reports'
udot = 'Roadkill.RKADMIN.UDOT_Regions'
udwr = 'Roadkill.RKADMIN.UDWR_Regions'
wmu = 'Roadkill.RKADMIN.WMU_Regions'
# roads = r'\\grhnas01sp.state.ut.us\AGSStores\data\SGID10.gdb\Roads'
# mileposts = r'\\grhnas01sp.state.ut.us\AGSStores\data\SGID10.gdb\UDOTMileposts'

# arcpy.env.workspace = r'C:\TEMP\Roadkill.gdb'
# arcpy.env.workspace = r'C:\PythonScripts\DatabaseConnections\Roadkill_TEST as RKAdmin.sde'
# reports = 'Reports'
# udot = 'UDOT_Regions'
# udwr = 'UDWR_Regions'
# wmu = 'WMU_Regions'
roads = r'\\<ip>\c$\ClusterStorage\Volume1\data\SGID10.gdb\Roads'
mileposts = r'\\<ip>\c$\ClusterStorage\Volume1\data\SGID10.gdb\UDOTMileposts'

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

scratch = r'C:\PythonScripts\scratch\scratch.gdb'
udotjoined = r'%s\udotjoined' % scratch
udwrjoined = r'%s\udwrjoined' % scratch
wmujoined = r'%s\wmujoined' % scratch
roadsjoined = r'%s\roadsjoined' % scratch
milepostsjoined = r'{0}\milepostsjoined'.format(scratch)
reportsLayer = 'reportsLayer'

ravenDbQueryUrl = r'http://<ip>:8079/databases/app_roadkill/indexes/UserByEmailIndex?&pageSize=1000'

logger = logging.Logger()
emailer = messaging.Emailer('stdavis@utah.gov', testing=False)
errors = []

try:
    # deleting previous temp data
    arcpy_helpers.DeleteIfExists([udotjoined, udwrjoined, roadsjoined, milepostsjoined, wmujoined])

    logger.logMsg('building users dictionary')
    users = {}
    results = requests.get(ravenDbQueryUrl).json()['Results']
    for row in results:
        users[str(row['UserId'])] = {'email': row['Email'], 'name': row['FullName'], 'agency': row['Agency']}
        # logger.logMsg(row['UserId'])
        # logger.logMsg(users[str(row['UserId'])])

    logger.logMsg('looping through roadkill reports')
    query = "{0} IS NOT NULL AND ({1} IS NULL OR {1} IN ('', ' '))".format(fldRESPONDER_ID, fldRESPONDER_NAME)
    cur = arcpy.UpdateCursor(reports, query)
    for f in cur:
        userid = f.getValue(fldRESPONDER_ID)[1:-1].lower()
        try:
            f.setValue(fldRESPONDER_AGENCY, users[userid]['agency'])
            f.setValue(fldRESPONDER_NAME, users[userid]['name'])
            f.setValue(fldRESPONDER_EMAIL, users[userid]['email'])
            cur.updateRow(f)
        except KeyError:
            msg = 'key error with %s' % userid
            logger.logMsg(msg)
            errors.append(msg)

    def getNearest(overlayFC, joinedOutput, reportsField, overlayField):
        logger.logMsg('calculating %s' % reportsField)
        arcpy.MakeFeatureLayer_management(reports, reportsLayer)
        arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(reportsField))
        logger.logMsg(arcpy.GetCount_management(reportsLayer).getOutput(0))
        logger.logMsg('spatial joining...')
        arcpy.SpatialJoin_analysis(reportsLayer, overlayFC, joinedOutput, "#", "KEEP_COMMON", "#", "CLOSEST", 100)
        logger.logMsg('adding join...')
        arcpy.AddJoin_management(reportsLayer, fldOBJECTID, joinedOutput, fldTARGET_FID)
        logger.logMsg(arcpy.GetCount_management(reportsLayer).getOutput(0))
        logger.logMsg('calcing field...')
        arcpy.CalculateField_management(reportsLayer, reportsField,
                                        '!%s.%s!' % (joinedOutput.split('\\')[-1], overlayField),
                                        "PYTHON")
        arcpy_helpers.DeleteIfExists([reportsLayer])

    getNearest(udot, udotjoined, fldUDOT_REGION, fldREGION)
    getNearest(udwr, udwrjoined, fldUDWR_REGION, fldNAME)
    getNearest(wmu, wmujoined, fldWMU, fldUnit_sub)

    logger.logMsg('calculating {0}'.format(fldROUTE))
    arcpy.MakeFeatureLayer_management(reports, reportsLayer)
    arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(fldROUTE))
    arcpy.SpatialJoin_analysis(reportsLayer, mileposts, milepostsjoined, '#', 'KEEP_COMMON', '#', 'CLOSEST', 5280) # search for points within a mile
    arcpy.AddJoin_management(reportsLayer, fldOBJECTID, milepostsjoined, fldTARGET_FID)
    mp = milepostsjoined.split('\\')[-1]
    arcpy.CalculateField_management(reportsLayer, fldROUTE,
                                    '!{0}.{1}!'.format(mp, fldRT_NAME),
                                    'PYTHON')
    arcpy.CalculateField_management(reportsLayer, fldROUTE_DIR,
                                    '!{}.{}!'.format(mp, fldRT_DIR),
                                    'PYTHON')
    arcpy.CalculateField_management(reportsLayer, fldMILEPOST,
                                    '!{}.{}!'.format(mp, fldMP),
                                    'PYTHON')
    arcpy_helpers.DeleteIfExists([reportsLayer])

    logger.logMsg('calculating %s' % fldHIGHWAY_ROAD)
    arcpy.MakeFeatureLayer_management(reports, reportsLayer)
    arcpy.SelectLayerByAttribute_management(reportsLayer, "NEW_SELECTION", "{0} IS NULL OR {0} IN ('', ' ')".format(fldHIGHWAY_ROAD))
    arcpy.SpatialJoin_analysis(reportsLayer, roads, roadsjoined, '#', 'KEEP_COMMON', '#', 'CLOSEST', 100)
    arcpy.AddJoin_management(reportsLayer, fldOBJECTID, roadsjoined, fldTARGET_FID)
    arcpy.CalculateField_management(reportsLayer, fldHIGHWAY_ROAD,
                                    '!%s.%s!' % (roadsjoined.split('\\')[-1], fldFULLNAME),
                                    "PYTHON")
    arcpy_helpers.DeleteIfExists([reportsLayer])

    if len(errors):
        emailer.sendEmail(logger.scriptName + ' - Errors', logger.log)
    else:
        emailer.sendEmail(logger.scriptName + ' - Success', logger.log)

except arcpy.ExecuteError:
    logger.logMsg('arcpy.ExecuteError')
    logger.logError()
    logger.logGPMsg()
    emailer.sendEmail(logger.scriptName + ' - arcpy.ExecuteError', logger.log)

except:
    logger.logError()
    emailer.sendEmail(logger.scriptName + ' - Python Error', logger.log)

logger.writeLogToFile()

print 'done'
