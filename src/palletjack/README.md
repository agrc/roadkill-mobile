# Palletjack

This [palletjack](https://github.com/agrc/palletjack) skid is used to push updates to security AGOL hosted feature layers from the roadkill database. See [#225](https://github.com/agrc/roadkill-mobile/issues/225) for more details.

Before the skid can be used, the layers need to published via ArcGIS Pro. I tried using the `arcgis` python package to do the initial publishing, but this caused issue with the `OBJECTID` field.
