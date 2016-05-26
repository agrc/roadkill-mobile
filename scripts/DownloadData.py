import arcpy
from os import path, makedirs, listdir, unlink
from glob import glob
from zipfile import ZipFile, ZIP_DEFLATED

'''
GP Parameters
0 - defQuery: String
1 - fileType: String ('shape' || 'dbf')
2 - area: FeatureSet
3 - outFile: File
'''

# variables
arcpy.AddMessage('setting variables')
defQuery = arcpy.GetParameterAsText(0)
fileType = arcpy.GetParameterAsText(1)
area = arcpy.GetParameterAsText(2)
if area == '#' or not area:
    arcpy.AddMessage('area: None')
    area = None
reportsFC = r'.\Roadkill_PROD as RKAdmin.sde\RoadKill.RKADMIN.Reports'
reports = 'reports'
outputFolder = arcpy.env.scratchWorkspace
# if not outputFolder:
#     outputFolder = r'C:\Temp'
outShapeFileName = 'roadkill_reports.shp'
outDBFName = 'roadkill_reports.dbf'

def verifyFolder(folder):
    arcpy.AddMessage('verifyingFolder: ' + folder)
    if not path.exists(folder):
        makedirs(folder)

def removePreviousData(data):
    arcpy.AddMessage('removingPreviousData: ' + data)
    if arcpy.Exists(data):
        arcpy.Delete_management(data)

try:
    #verifyFolder(outputFolder)

    arcpy.AddMessage('Creating Feature Layer')
    arcpy.MakeFeatureLayer_management(reportsFC, reports, defQuery)

    if area is not None and arcpy.GetCount_management(area).getOutput(0) != '0':
        arcpy.AddMessage('Selecting by Location')
        arcpy.SelectLayerByLocation_management(reports, 'INTERSECT', area)

    # export to file type
    if fileType == 'shape':
        # removePreviousData(outputFolder + '\\' + outShapeFileName)

        arcpy.AddMessage('Exporting to shapefile')
        if defQuery != '1 = 1':
            arcpy.FeatureClassToFeatureClass_conversion(reports, outputFolder, outShapeFileName)
        else:
            arcpy.FeatureClassToShapefile_conversion(reports, outputFolder)

        arcpy.AddMessage('zipping files')
        zipPath = outputFolder + r'\roadkill_reports.zip'
        zip = ZipFile(zipPath, 'w', ZIP_DEFLATED)

        for fname in listdir(outputFolder):
            if fname.find('.gdb') == -1 and fname.find('.zip') == -1 and fname.find('messages.xml'):
                zip.write(outputFolder + '\\' + fname, fname)
        zip.close()

        outFile = zipPath
    else:
        # removePreviousData(outputFolder + '\\' + outDBFName)

        arcpy.AddMessage('Exporting to dbf')
        arcpy.TableToTable_conversion(reports, outputFolder, outDBFName)

        outFile = outputFolder + '\\' + outDBFName

    print outFile
    arcpy.SetParameterAsText(3, outFile)
except:
    import sys, traceback
    tb = sys.exc_info()[2]
    tbinfo = traceback.format_tb(tb)[0]
    pymsg = "PYTHON ERRORS:\nTraceback Info:\n" + tbinfo + "\nError Info:\n    " + \
            str(sys.exc_type)+ ": " + str(sys.exc_info()) + "\n"
    arcpy.AddError(pymsg)

    msgs = "GP ERRORS:\n" + arcpy.GetMessages(2) + "\n"
    arcpy.AddError(msgs)

print 'done'
