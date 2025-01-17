# Manual Tests to perform before release on both iOS and Android

## Facebook Test Credentials

email: `open_vboxopy_user@tfbnw.net`  
password: `tester`

## Select Role

| setup | action                       | assertion                             |
|-------|------------------------------|---------------------------------------|
|       | select public                | confirm that all three oauth options are presented on the login screen |
|       | select contractor and agency | you are taken directly to the utahid signin |

## Auth

| set up              | action                                                       | assertion |
|---------------------|--------------------------------------------------------------|-----|
|                     | log in with each provider: utahid, google, facebook, & apple | navigates to new user or main screen |
|                     | cancel oauth process                                         | navigates back to login screen |
| log in successfully | kill app and then restart                                    | automatically logs in and goes to the Main screen |
|                     | Main -> Menu -> Logout                                       | presents confirmation dialog and then navigates to login screen |

## New User

| set up                                    | action                                  | assertion |
|-------------------------------------------|-----------------------------------------|-----|
|                                           | log in with unregistered user           | navigates to new user screen, name and email are populated |
| log in with unregistered user             | press "Cancel"                          | navigates back to log in screen |
| log in with unregistered, non-public user | input phone number and press "Register" | navigates to main screen and an email is sent to admins |
|                                           | approve user from admin email           | verify that email was sent to user |
|                                           | reject user from admin email            | verify that email was sent to user |

## Main

| set up                          | action                               | assertion |
|---------------------------------|--------------------------------------|-----|
| pan map                         | click on the zoom to location button | map is panned back to current location |
| tap on zoom to location         | pan the map                          | follow user location is disabled |
|                                 |                                      | verify that drawer navigation works |
| (doesn't work on iOS simulator) | contact                              | opens mail app with to and subject filled out |
| log in as public                |                                      | verify that route button is not visible |

## Add Report

### Public Role

| set up                                    | action                                | assertion |
|-------------------------------------------|---------------------------------------|-----|
|                                           | tap plus button                       | report drawer slides open so that you can see everything down to the "If you encounter...", shows public report form |
|                                           | tap plus button                       | crosshair icon is displayed in the center of the remaining map |
|                                           | tap plus button                       | the map zooms into the highest zoom level and follow user location is enabled |
| open the report drawer                    | tap on map button to zoom to location | map is centered on user's location |
| open the report drawer                    | tap on the please call phone number   | verify that a call is initiated (doesn't work on ios emulator) |
| open the report drawer                    | tap "Set Location"                    | marker is placed on the map at the crosshair location, drawer animates up to full height, set location controls are hidden, and main form is shown |
| open the report drawer and set a location | tap "Cancel" button                   | "are you sure" dialog is presented and acts appropriately |

### Public Report Type

Setup: open the report and select a location

| set up                               | action                         | assertion |
|--------------------------------------|--------------------------------|------|
|                                      | set repeat submission to "Yes" | "Please understand..." text is displayed |
|                                      | click on date picker           | controls are shown and future dates are greyed out |
|                                      | submit report with no photo    | success dialog should show and report should be reset and closed |
|                                      | submit report with photo       | success dialog should show and report should be reset and closed |
| login with google, facebook, & apple | submit report                  | success dialog, verify that notification email was sent |

### Contractor Role

| set up | action          | assertion           |
|--------|-----------------|---------------------|
|        | tap plus button | "No vehicle tracking route found..." dialog shows up |

### Routes

Setup: log in as contractor or agency

| set up                      | action                                      | assertion |
|-----------------------------|---------------------------------------------|-----|
|                             | tap on "Track" button                       | button turns green and vehicle icon shows on map with track displaying, and polyline begins to display |
| active tracking             | tap on "track" button                       | modal shows up with buttons and current state |
| active tracking, open modal | tap on pause                                | "Track" button and route polyline turn red and modal closes |
| paused tracking             | tap on "Track" button                       | tracking is resumed |
| active tracking             | tap on "Report" button, fill out and submit | prompt shows that report was saved and will be submitted later with route |
| active tracking, open modal | tap on "Cancel Route"                       | are you sure prompt is displayed and acts appropriately |
| active tracking, open modal | tap on "Finish and Submit Route"            | spinner is displayed and route/pickups are submitted and tracking state is stopped and reset |

### Agency/Admin Role

| set up | action          | assertion                            |
|--------|-----------------|--------------------------------------|
|        | tap plus button | alert shows asking which report type |

### Species Component

Setup: open a report and click "Set Location"

| set up | action                  | assertion                                 |
|--------|-------------------------|-------------------------------------------|
|        | toggle able to identify | validate that yes shows search types and no shows "Does the animal have" |

Setup: able to identify to "No"

| set up | action                          | assertion                         |
|--------|---------------------------------|-----------------------------------|
|        | select a "have" value           | "look like a..." is shown         |
|        | select a "look" value           | "species..." is shown             |
|        | select a species value          | validate that a species value is set on the form |
|        | select a different "have" value | "species..." is hidden and "look like a..." is reset |
|        | select "Unknown" "look" value   | validate that species value is something like "scales-unknown" |
|        | select a known "look" value     | validate that the species is reset and shown |

Setup: able to identify to "Yes"

| set up                                        | action                              | assertion |
|-----------------------------------------------|-------------------------------------|-----|
|                                               | select a frequent species           | validate the species value is populated and that the confidence control is shown |
|                                               | select a confidence level           | validate that the confidence level value is populated |
|                                               | select a different frequent species | validate that the species value is updated and that the confidence level is reset |
|                                               | select a different search type      | validate that the species and confidence values are reset and the new controls are shown |
| select "common"                               | tap on input                        | validate that search modal is displayed with the species list |
|                                               | begin typing                        | verify that the list values are filtered |
|                                               | select white-tailed deer (rare)     | rare warning dialog is displayed |
|                                               | tap on "X" to clear the search      | validate that input value is cleared and the list filter is reset |
|                                               | select a value                      | validate that the species value is populated and the confidence level is shown |
| clear search input                            | tap on "X" again                    | verify that modal is closed and value is reset |
|                                               | select "class" search type          | select value and verify that species options are shown and selectable |
| duplicate test above for "order" and "family" |                                     |     |

### Pickup Report Type

Setup: open the report and select a location

| set up                      | action                                                           | assertion |
|-----------------------------|------------------------------------------------------------------|-----|
|                             |                                                                  | repeat submission is not shown |
|                             | take new photo                                                   | native photo capture is shown and photo is passed back to the form |
|                             | choose existing photo                                            | native photo selection is shown and photo is passed back to the form |
| take or choose a photo      | click on "X" button                                              | verify that photo was cleared |
| submit report with no photo | success dialog should show and report should be reset and closed |     |
| submit report with photo    | success dialog should show and report should be reset and closed |     |
|                             | submit report                                                    | success dialog should show and report should be reset and closed |

### Form Reset

| set up                        | action         | assertion                   |
|-------------------------------|----------------|-----------------------------|
| fill out all values in a form | close the form | reopen the same report type and verify that all controls have been reset |

## My Reports

Setup: open the My Reports view in the main menu

| set up | action          | assertion                                         |
|--------|-----------------|---------------------------------------------------|
|        |                 | existing reports should be listed in descending chronological order |
|        | tap on a report | the app navigates to the report info page and displays data about the specific report |

### Report Info

Setup: Main menu -> My Reports -> Tap on a report

| set up | action                                | assertion                   |
|--------|---------------------------------------|-----------------------------|
|        | tap on a report with a valid photo    | the photo thumbnail and id is displayed |
|        | tap on a report without a valid photo | the photo controls are not displayed |
|        |                                       | map is zoomed to the animal location associated with the report |

### Route Info

Setup: Main menu -> My Reports -> Tap on a route

| set up                      | action          | assertion                    |
|-----------------------------|-----------------|------------------------------|
|                             | tap on a route  | the map is shown with the polyline and pickup pins, pickups are listed at the bottom |
| tap on a route with pickups | tap on a pickup | pickup report shows the appropriate data |

### My Profile

Setup: Main menu -> My Profile

| set up | action                                               | assertion    |
|--------|------------------------------------------------------|--------------|
|        |                                                      | verify that all of the info looks correct |
|        | change phone number and organization then tap update | go away from screen and then back into it and verify that the phone change was persisted |
|        | tap on "Delete Account" button                       | the user is logged out and the user PID is wiped from the `users` table |

### Offline

Setup: turn on airplane mode

| set up                   | action                                                                  | assertion |
|--------------------------|-------------------------------------------------------------------------|-----|
|                          | browser around the map in a place that you visited when you were online | map tiles are loaded from the cache |
|                          | submit a report                                                         | offline alert is shown, alert bubble is shown on drawer toggle button on main screen, alert bubble is shown on app icon |
| submit an offline report | go to my reports page                                                   | cached report should show up and be viewable |
|                          | submit a route with some pickups                                        | offline alert is shown, alert bubble is shown on drawer toggle button on main screen, alert bubble is shown on app icon |
| submit some offline data | turn off airplane mode                                                  | offline data is submitted automatically |
