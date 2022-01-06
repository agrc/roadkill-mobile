export function getNewReportHandler(upload, createReport) {
  return async function create(request, response) {
    const user_id = response.locals.user.appUser.id;

    let bucket_path = null;
    if (request.file) {
      bucket_path = await upload(request.file, user_id);
    }

    const reportId = await createReport({
      ...request.body,
      bucket_path,
      user_id,
    });

    return response.status(201).json({
      report_id: reportId,
      success: true,
    });
  };
}

export function getNewPickupHandler(upload, createPickup) {
  return async function create(request, response) {
    const user_id = response.locals.user.appUser.id;

    if (!request.file) {
      response.status(400).json({
        error: 'No photo provided',
      });
      return;
    }

    const reportId = await createPickup({
      ...request.body,
      bucket_path: await upload(request.file, user_id),
      user_id,
    });

    return response.status(201).json({
      report_id: reportId,
      success: true,
    });
  };
}

export function getGetAllHandler(getAllReports) {
  return async function getAllHandler(request, response) {
    const reports = await getAllReports(response.locals.user.sub, response.locals.authProvider);

    return response.status(200).json({
      reports,
    });
  };
}

export function getGetReportHandler(getReport) {
  return async function getReportHandler(request, response) {
    const report = await getReport(request.params.reportId);

    if (report) {
      return response.status(200).json({
        report,
      });
    }

    return response.status(404).send(`no report found for id: ${request.params.reportId}`);
  };
}
