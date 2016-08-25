# roadkill-mobile
Wildlife Vehicle Collision Mobile App

## Deployment (these services support both mobile and desktop)
1. Make sure that PHP is installed on the web server.
1. Make sure that there is an `appcache` MIME type on the web server. (extension: `appcache`, type: `text/cache-manifest`)
1. Use `permission_proxy_config.json` to create a new application in permission proxy.
1. Publish `maps/Overlays.mxd` as `Roadkill/Overlays` (open).
1. Publish `maps/MapService.mxd` as `Roadkill/MapService` (secure).
    - Enable feature access with "Create" and "Query" allowed operations.
    - Max records returned: 10000
1. Publish `maps/FeatureService.mxd` as `Roadkill/FeatureService` (secure).
    - Enable feature access with "Create", "Query", "Update", & "Delete" allowed operations.
1. Publish `scripts\PublicToolbox\SendDiagnostics` as `Roadkill/PublicToolbox/SendDiagnostics` (open).
    - You may need to manually copy the `agrc` package to the `...\arcgisserver\directories\arcgissystem\arcgisinput\Roadkill\PublicToolbox.GPServer\extracted\v101\scripts` folder.
1. Publish `roadkill-desktop\scripts\Toolbox\*` as `Roadkill/Toolbox/*` (secure).
    - `RouteMilepostsSegment`: Params: "0015", "100", "110"
    - `DownloadData`: Params: "1 = 2", "shp"
        - You may need to manually copy the `*.sde` file associated with this tool to the `C:\arcgisserver\directories\arcgissystem\arcgisinput\Roadkill\Toolbox.GPServer\extracted\v101\scripts\` directory.
    - `Print`: Params:
        - `baseMap`: "Terrain"
        - `extent`: `{"xmin": 1, "xmax": 2, "ymin": 1, "ymax": 2}`
        - `defQueryTxt`: "hello"
