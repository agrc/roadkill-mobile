export function getNewReportHandler(upload, createReport) {
  return async function create(request, response) {
    let bucket_path = null;
    if (request.file) {
      bucket_path = await upload(request.file, request.body.user_id);
    }

    const reportId = await createReport({
      ...request.body,
      bucket_path,
    });

    return response.status(201).json({
      report_id: reportId,
      success: true,
    });
  };
}

export function getNewPickupHandler(upload, createPickup) {
  return async function create(request, response) {
    if (!request.file) {
      response.status(400).json({
        error: 'No photo provided',
      });
      return;
    }

    const reportId = await createPickup({
      ...request.body,
      bucket_path: await upload(request.file, request.body.user_id),
    });

    return response.status(201).json({
      report_id: reportId,
      success: true,
    });
  };
}
