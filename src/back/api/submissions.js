export function getGetAllHandler(getMySubmissions) {
  return async function getAllHandler(_, response) {
    const submissions = await getMySubmissions(response.locals.user.authId, response.locals.authProvider);

    return response.status(200).json({
      submissions,
    });
  };
}
