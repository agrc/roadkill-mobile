# Palletjack

This [palletjack](https://github.com/agrc/palletjack) skid is used to push updates to security AGOL hosted feature layers from the roadkill database. See [#225](https://github.com/agrc/roadkill-mobile/issues/225) for more details.

## Deployment

1. Run `create_views.sql` to create the AGOL views.
1. Run `python main.py` from a machine that has access to `arcpy` to publish the layers to AGOL.

## Development

1. `pip install -r requirements.txt`
1. `pip install -r requirements.dev.txt`
