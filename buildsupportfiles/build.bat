cd /d C:\inetpub\wwwroot\libs\dojo-release-1.6.1-src\util\buildscripts
start /WAIT build profileFile=Z:\Documents\Projects\RoadkillReporter_Mobile\buildsupportfiles\build.profile.js
robocopy "C:\inetpub\wwwroot\libs\dojo-release-1.6.1-src\release\RoadkillReporter_Mobile\roadkill" "Z:\Documents\Projects\RoadkillReporter_Mobile\build" roadkill.js
robocopy "C:\inetpub\wwwroot\libs\dojo-release-1.6.1-src\release\RoadkillReporter_Mobile\css" "Z:\Documents\Projects\RoadkillReporter_Mobile\build\css" /E
robocopy "C:\inetpub\wwwroot\libs\dojo-release-1.6.1-src\release\RoadkillReporter_Mobile\images" "Z:\Documents\Projects\RoadkillReporter_Mobile\build\images" /E
robocopy "C:\inetpub\wwwroot\libs\dojo-release-1.6.1-src\release\RoadkillReporter_Mobile\data" "Z:\Documents\Projects\RoadkillReporter_Mobile\build\data" /E
pause