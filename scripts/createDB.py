# create roadkill database

# Scott Davis | stdavis@utah.gov
# 7-28-11

import arcpy, sys, os

import agrc
logger = agrc.logging.Logger()

# variables
out_folder = r"C:\TEMP"
dbName = "roadkill"
reports = "Reports"
gdb = out_folder + "\\" + dbName + ".gdb"
reportsFC = gdb + "\\" + reports
domainsXLS = r"C:\inetpub\wwwroot\RoadkillReporter_Mobile\docs\data\domains.xls"
domains = ["species", 
           "ageclass",
           "gender",
           "udot_regions",
           "udwr_regions",
           "roads"
           ]
xyphoidDomainName = "roadkill_xyphoid"
xyphoidMin = 0
xyphoidMax = 40

#[name, type, length, domain_name]
fields = [
          ["REPORT_DATE", "DATE", None, None],
          ["SPECIES", "TEXT", 30, "roadkill_species"],
          ["AGE_CLASS", "TEXT", 10, "roadkill_ageclass"],
          ["GENDER", "TEXT", 10, "roadkill_gender"],
          ["HIGHWAY_ROAD", "TEXT", 50, "roadkill_roads"],
          ["UDOT_REGION", "TEXT", 1, "roadkill_udot_regions"],
          ["UDWR_REGION", "TEXT", 15, "roadkill_udwr_regions"],
          ["XYPHOID", "SHORT", None, "roadkill_xyphoid"],
          ["RESPONDER_ID", "GUID", None, None],
          ["COMMENTS", "TEXT", 255, None],
          ["TAG_COLLAR_NUM", "TEXT", 20, None],
          ["GPS_ACCURACY", "SHORT", None, None],
          ["ROUTE_MILEPOST", "TEXT", 30, None],
          ["ADDRESS", "TEXT", 50, None]
          ]

# classes
class AddFieldBase:
    in_table = reportsFC

try:
    if arcpy.Exists(gdb):
        print "deleting old db"
        arcpy.Delete_management(gdb)
        logger.logGPMsg()
    
    print "creating geodatabase"
    arcpy.CreateFileGDB_management(out_folder, dbName)
    logger.logGPMsg()
    
    print "creating coded value domains"
    for d in domains:
        print d
        arcpy.TableToDomain_management(domainsXLS + "\\" + d + "$", "CODE", "CODE", gdb, "roadkill_" + d, "roadkill_" + d)
        logger.logGPMsg()
        
    print "creating xyphoid range domain"
    arcpy.CreateDomain_management(gdb, xyphoidDomainName, xyphoidDomainName, "SHORT", "RANGE")
    logger.logGPMsg()
    arcpy.SetValueForRangeDomain_management(gdb, xyphoidDomainName, xyphoidMin, xyphoidMax)
    logger.logGPMsg()
    
    print "creating Reports fc"
    srPath = os.path.join(arcpy.GetInstallInfo()["InstallDir"], 
                          r"Coordinate Systems\Projected Coordinate Systems\UTM\NAD 1983\NAD 1983 UTM Zone 12N.prj")
    spatial_reference = arcpy.SpatialReference(srPath)
    arcpy.CreateFeatureclass_management(gdb, reports, "POINT", None, None, None, spatial_reference)
    logger.logGPMsg()
    
    print "adding fields"
    for f in fields:
        print f
        arcpy.AddField_management(reportsFC, f[0], f[1], None, None, f[2], None, None, None, f[3])
        logger.logGPMsg()
    
    logger.logGPMsg()
    
except arcpy.ExecuteError:
     logger.logMsg('arcpy.ExecuteError')
     logger.logError()
     logger.logGPMsg()

except:
     logger.logError()

print "done"
