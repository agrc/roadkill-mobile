'''
Used to send diagnostic information to tech support. Including
unsubmitted report data to make sure that it doesn't get lost.
'''

import arcpy
from agrc import messaging

'''
GP Parameters:
0 - username: String
1 - unsubmittedReports: String (json array of report objects)
2 - platform: String
'''

# logger = logging.Logger() # having troubles with location of logs directory when run via Catalog
emailer = messaging.Emailer('stdavis@utah.gov')
msg = ''

username = arcpy.GetParameterAsText(0)
msg += 'username: ' + username + '\n'

unsubmittedReports = arcpy.GetParameterAsText(1)
msg += 'unsubmittedReports: ' + unsubmittedReports + '\n'

platform = arcpy.GetParameterAsText(2)
msg += 'platform: ' + platform + '\n'

emailer.sendEmail('Roadkill Diagnostics Report for ' + username, msg)
