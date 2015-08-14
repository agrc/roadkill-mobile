'''
Used to send diagnostic information to tech support. Including
unsubmitted report data to make sure that it doesn't get lost.
'''

import arcpy, agrc

'''
GP Parameters:
0 - username: String
1 - unsubmittedReports: String (json array of report objects)
2 - platform: String
'''

logger = agrc.logging.Logger()
emailer = agrc.email.Emailer('stdavis@utah.gov')

try:
    username = arcpy.GetParameterAsText(0)
    logger.logMsg('username: ' + username)
    
    unsubmittedReports = arcpy.GetParameterAsText(1)
    logger.logMsg('unsubmittedReports: ' + unsubmittedReports)
    
    platform = arcpy.GetParameterAsText(2)
    logger.logMsg('platform: ' + platform)
    
    emailer.sendEmail('Roadkill Diagnostics Report for ' + username, logger.log)

except arcpy.ExecuteError:
    logger.logMsg('arcpy.ExecuteError')
    logger.logError()
    logger.logGPMsg()
    emailer.sendEmail(logger.scriptName + ' - arcpy.ExecuteError', logger.log)

except:
    logger.logError()
    emailer.sendEmail(logger.scriptName + ' - Python Error', logger.log)
