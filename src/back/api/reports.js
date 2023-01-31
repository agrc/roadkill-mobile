export function getNewReportHandler(upload, createReport, sendReportNotification) {
  return async function create(request, response) {
    const user_id = response.locals.userId;

    let bucket_path = null;
    if (request.file) {
      bucket_path = await upload(request.file, user_id);
    }

    const reportId = await createReport({
      ...request.body,
      bucket_path,
      user_id,
    });

    sendReportNotification(reportId);

    return response.status(201).json({
      report_id: reportId,
      success: true,
    });
  };
}

export function getNewPickupHandler(upload, createPickup) {
  return async function create(request, response) {
    const user_id = response.locals.userId;

    let bucket_path = null;
    if (request.file) {
      bucket_path = await upload(request.file, user_id);
    }

    const reportId = await createPickup({
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
