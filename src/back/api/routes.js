export function getNewRouteHandler(createRoute) {
  return async function create(request, response) {
    const routeId = await createRoute({
      user_id: response.locals.user.appUser.id,
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
