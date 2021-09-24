# Manual Tests to perform before release on both iOS and Android

## Setup

1. Run `buildForSimulators.sh` which will build apps, install them and open them on both simulators.

email: `open_vboxopy_user@tfbnw.net`  
password: `tester`

## Select Role

| setup             | action                       | assertion                 |
|-------------------|------------------------------|---------------------------|
|                   | select public                | confirm that all three oauth options are presented on the login screen |
|                   | select contractor and agency | confirm that only utahid is available |
| select contractor | restart app                  | confirm that select role screen is skipped and selection is remembered |

## Auth

| set up              | action                                              | assertion |
|---------------------|-----------------------------------------------------|-----|
|                     | log in with each provider: utahid, google, facebook | navigates to new user or main screen |
|                     | cancel oauth process                                | navigates back to login screen |
| log in successfully | kill app and then restart                           | automatically logs in and goes to the Main screen |
|                     | Main -> Menu -> Logout                              | presents confirmation dialog and then navigates to login screen |

## New User

| set up                        | action                                  | assertion |
|-------------------------------|-----------------------------------------|-----|
|                               | log in with unregistered user           | navigates to new user screen, name and email are populated |
| log in with unregistered user | press "Cancel"                          | navigates back to log in screen |
| log in with unregistered user | input phone number and press "Register" | navigates to main screen and an email is sent to admins |

## Main

| set up                          | action                               | assertion |
|---------------------------------|--------------------------------------|-----|
| pan map                         | click on the zoom to location button | map is panned back to current location |
| tap on zoom to location         | pan the map                          | follow user location is disabled |
|                                 |                                      | verify that drawer navigation works |
| (doesn't work on iOS simulator) | contact                              | opens mail app with to and subject filled out |
| log in as agency or contractor  |                                      | verify that route button is visible |
| log in as public                |                                      | verify that route button is not visible |

## Add Report

### Public Role

| set up                                          | action                                | assertion |
|-------------------------------------------------|---------------------------------------|-----|
|                                                 | tap plus button                       | report drawer slides open so that you can see everything down to the set location button, shows public report form |
|                                                 | tap plus button                       | crosshair icon is displayed in the center of the remaining map |
|                                                 | tap plus button                       | the map zooms into the highest zoom level and follow user location is enabled |
| open the report drawer                          | tap on map button to zoom to location | map is centered on user's location |
| open the report drawer and set a location       | tap close button                      | "are you sure" dialog is presented and acts appropriately |
| open the report drawer and don't set a location | tap close button                      | dialog is closed without confirmation |
| open the report drawer                          | tap on the please call phone number   | verify that a call is initiated (doesn't work on ios emulator) |
| open the report drawer                          | tap "Set Location"                    | marker is placed on the map at the crosshair location, drawer animates up to full height, set location controls are hidden, and main form is shown |
| open report drawer, set location                | tap "Edit Location"                   | drawer is pulled back down and set location controls are shown |

#### Public Report Type

Setup: open the report and select a location

| set up                              | action                         | assertion |
|-------------------------------------|--------------------------------|-------|
|                                     | set repeat submission to "Yes" | alert is presented with cancel and continue options |
| set repeat submission to "Yes"      | click on cancel                | report is closed |
| set repeat submission to "Yes"      | click on continue              | report remains open |
|                                     | submit report with no photo    | success dialog should show and report should be reset and closed |
|                                     | submit report with photo       | success dialog should show and report should be reset and closed |
| login with both google and facebook | submit report                  | success dialog |

### Contractor Role

| set up | action          | assertion           |
|--------|-----------------|---------------------|
|        | tap plus button | pickup report shows |

#### Pickup Report Type

Setup: open the report and select a location

| set up                 | action                | assertion                   |
|------------------------|-----------------------|-----------------------------|
|                        |                       | repeat submission is not shown and photo is required |
|                        | take new photo        | native photo capture is shown and photo is passed back to the form |
|                        | choose existing photo | native photo selection is shown and photo is passed back to the form |
| take or choose a photo | click on "X" button   | verify that photo was cleared |
|                        | submit report         | success dialog should show and report should be reset and closed |

### Agency/Admin Role

| set up | action          | assertion                            |
|--------|-----------------|--------------------------------------|
|        | tap plus button | alert shows asking which report type |
