# roadkill-mobile
Wildlife Vehicle Collision Mobile App

## Deployment (these services support both mobile and desktop)
1. Publish `maps/Overlays.mxd` as `Roadkill/Overlays` (open).
1. Publish `maps/MapService.mxd` as `Roadkill/MapService` (secure).
    - Enable feature access with "Create" and "Query" allowed operations.
    - Max records returned: 10000
1. Publish `maps/FeatureService.mxd` as `Roadkill/FeatureService` (secure).
    - Enable feature access with "Create", "Query", "Update", & "Delete" allowed operations.
1. Publish `scripts\PublicToolbox\SendDiagnostics` as `Roadkill/PublicToolbox/SendDiagnostics` (open).
1. Publish `scripts\Print\ExportWebMap` as `Roadkill/Print/ExportWebMap` (open).
    - `ExportWebMap`: synchronous, templateFolder: `scripts/PrintTemplates/`
1. Publish `scripts\Toolbox\*` as `Roadkill/Toolbox/*` (secure).
    - `RouteMilepostsSegment`: Params: "0015", "100", "110"
    - `DownloadData`: Params: "1 = 2", "shp"
