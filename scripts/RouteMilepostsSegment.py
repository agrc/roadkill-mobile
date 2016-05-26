import arcpy

'''
GP Parameters
0 - route
1 - fromMP
2 - toMP
3 - outSegment - FeatureSet
'''

arcpy.env.overwriteoutput = True
arcpy.env.outputCoordinateSystem = arcpy.SpatialReference(3857)
arcpy.env.geographicTransformations = 'NAD_1983_to_WGS_1984_5'

# variables
route = arcpy.GetParameterAsText(0) + 'P'
fromMP = float(arcpy.GetParameterAsText(1))
toMP = float(arcpy.GetParameterAsText(2))
#route = '0015'
#fromMP = float('5.5')
#toMP = float('50.7')

outputFolder = arcpy.env.scratchWorkspace
if not outputFolder:
    arcpy.AddMessage("Using Temp")
    outputFolder = r'C:\Temp'

# field names
ROUTE = 'ROUTE'
FromMP = 'FROM_MP'
ToMP = 'TO_MP'
RT_NAME = 'LABEL'
RT_DIR = 'RT_DIR'

routesFC = r'C:\MapData\SGID10.gdb\UDOTRoutes_LRS'
routesLyr = 'routesLyr'
tableTemplate = r'.\Schemas.gdb\RouteMilepostsTemplate'
eventLayer = 'eventLayer'

# create new in_memory table to hold values
arcpy.AddMessage('creating temp table')
tbl = arcpy.CreateTable_management('in_memory', 'tempTbl', tableTemplate)

# add new row to table
icur = arcpy.InsertCursor(tbl)
row = icur.newRow()
row.setValue(ROUTE, route)
row.setValue(FromMP, fromMP)
row.setValue(ToMP, toMP)
icur.insertRow(row)

# create route layer to filter out negative direction routes
arcpy.AddMessage('creating route layer')
arcpy.MakeFeatureLayer_management(routesFC, routesLyr, "{0} = '{1}'".format(RT_NAME, route))

# generate route event layer
arcpy.AddMessage('creating route event layer')
arcpy.MakeRouteEventLayer_lr(routesLyr, RT_NAME, tbl, '%s LINE %s %s' % (ROUTE, FromMP, ToMP), eventLayer)

cur = arcpy.SearchCursor(eventLayer)
row = cur.next()
if row.getValue('Shape').length > 0:
    arcpy.AddMessage('copying features')
    fs = arcpy.CopyFeatures_management(eventLayer, outputFolder + r'/outFC')

    arcpy.SetParameter(3, fs)
else:
    arcpy.AddError('No match found for that route.')

arcpy.AddMessage("Done")
