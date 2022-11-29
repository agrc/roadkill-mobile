export function getNewRouteHandler(createRoute) {
  return async function create(request, response) {
    const routeId = await createRoute({
      user_id: response.locals.userId,
      geog: request.body.geog,
      start_time: request.body.start_time,
      end_time: request.body.end_time,
      submit_date: request.body.submit_date,
    });

    return response.status(201).json({
      route_id: routeId,
      success: true,
    });
  };
}

export function getGetRouteHandler(getRoute) {
  return async function getRouteHandler(request, response) {
    const route = await getRoute(request.params.routeId, response.locals.userId);

    if (route) {
      return response.status(200).json({
        route,
      });
    }

    return response.status(404).send(`no route found for id: ${request.params.routeId}`);
  };
}
