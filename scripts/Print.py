import arcpy, json

'''
GP Parameters
0 - baseMap:String - name of the cached service (Streets)
1 - extent: {xmin: Number, ymin: Number, xmax: Number, ymax: Number}
2 - routeBuffer: featureSet
3 - singleFeatures: String[] - object id's of single features
4 - clusterFeatures: featureSet
5 - visibleLayers: String[] - UDOT, UDWR
6 - defQueryTxt: String
7 - outFile: String - path to pdf
'''

def scrub(parameter):
    if parameter == '#' or not parameter:
        return None
    else:
        return parameter

arcpy.AddMessage('Getting Parameters')

baseMap = arcpy.GetParameterAsText(0)
extent = json.loads(arcpy.GetParameterAsText(1))
routeBuffer = scrub(arcpy.GetParameterAsText(2))
singleFeatures = scrub(arcpy.GetParameterAsText(3))
if singleFeatures:
    singleFeatures = json.loads(singleFeatures)
clusterFeatures = scrub(arcpy.GetParameterAsText(4))
visibleLayers = arcpy.GetParameterAsText(5)
if visibleLayers:
    visibleLayers = json.loads(visibleLayers)
defQueryTxt = arcpy.GetParameterAsText(6)

# variables
mxdPath = r'\\172.16.17.53\ArcGISServer\serverprojects\Roadkill\PrintTemplate.mxd'
outFileName = 'map.pdf'
scratch = arcpy.env.scratchWorkspace
if not scratch:
    scratch = 'C:/Temp'
outPDF = scratch + '\\' + outFileName


# open mxd
arcpy.AddMessage('Opening mxd')
mxd = arcpy.mapping.MapDocument(mxdPath)

# base map layers
arcpy.AddMessage('Updating basemap layer')
lyrs = arcpy.mapping.ListLayers(mxd)
for l in lyrs:
    if l.name == baseMap:
        l.visible = True
    else: 
        try:
            visibleLayers.index(l.name)
            l.visible = True
        except:
            print 'nothing'

# update extent
arcpy.AddMessage('Updating extent')
dataFrame = arcpy.mapping.ListDataFrames(mxd)[0]
mxdExtent = dataFrame.extent
mxdExtent.XMin = extent['xmin']
mxdExtent.YMin = extent['ymin']
mxdExtent.XMax = extent['xmax']
mxdExtent.YMax = extent['ymax']
dataFrame.extent = mxdExtent

# route buffer
if routeBuffer:
    arcpy.AddMessage('Adding buffer graphic')
    arcpy.CopyFeatures_management(routeBuffer, scratch + r'\scratch.gdb\rkBuffer')
    bufLyr = lyrs[4]
    bufLyr.replaceDataSource(scratch + r'\scratch.gdb', 'FILEGDB_WORKSPACE', 'rkBuffer')
    bufLyr.visible = True
    
# single features
if singleFeatures:
    arcpy.AddMessage('Adding single features')
    singleLyr = lyrs[1]
    singleLyr.definitionQuery = 'OBJECTID IN (%s)' % ', '.join(map(str, singleFeatures))
    singleLyr.visible = True
    
# cluster features
if clusterFeatures:
    arcpy.AddMessage('Adding cluster features')
    arcpy.CopyFeatures_management(clusterFeatures, scratch + r'\scratch.gdb\rkPoints')
    clusterLyr = lyrs[0]
    clusterLyr.replaceDataSource(scratch + r'\scratch.gdb', 'FILEGDB_WORKSPACE', 'rkPoints')
    clusterLyr.visible = True
    
# def query text
arcpy.AddMessage('Updating def query text')
elements = arcpy.mapping.ListLayoutElements(mxd, 'TEXT_ELEMENT')
for el in elements:
    if el.text == '[defQuery]':
        el.text = defQueryTxt
    
arcpy.AddMessage('Exporting map to PDF')
arcpy.mapping.ExportToPDF(mxd, outPDF)

arcpy.AddMessage('outPDF: ' + outPDF)

arcpy.SetParameterAsText(7, outPDF)

arcpy.AddMessage('Done.')