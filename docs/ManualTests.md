# Manual Tests to perform before release on both iOS and Android

## Setup

1. Run `buildForSimulators.sh` which will build apps, install them and open them on both simulators.

## Auth

| set up              | action                                              | assertion                                         |
| ------------------- | --------------------------------------------------- | ------------------------------------------------- |
|                     | log in with each provider: utahid, google, facebook | navigates to new user or main screen              |
|                     | cancel oauth process                                | navigates back to login screen                    |
| log in successfully | kill app and then restart                           | automatically logs in and goes to the Main screen |
|                     | Main -> Menu -> Logout                              | navigates to login screen                         |

## Main

| set up                          | action                               | assertion                                     |
| ------------------------------- | ------------------------------------ | --------------------------------------------- |
| pan map                         | click on the zoom to location button | map is panned back to current location        |
|                                 |                                      | verify that drawer navigation works           |
| (doesn't work on iOS simulator) | contact                              | opens mail app with to and subject filled out |
