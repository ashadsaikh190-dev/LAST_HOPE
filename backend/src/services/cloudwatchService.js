const { PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { cloudWatchClient, isAwsConfigured } = require('../config/aws');

/**
 * Emits custom operational metrics to Amazon CloudWatch
 */
const recordMetric = async (metricName, value = 1, unit = 'Count', dimensions = []) => {
  if (isAwsConfigured) {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'AutonomousAdmissions/Operations',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: dimensions,
          },
        ],
      });
      await cloudWatchClient.send(command);
    } catch (err) {
      // Non-blocking log
      console.warn(`[CloudWatch Metric Error] ${err.message}`);
    }
  } else {
    // Local dev trace
    // console.log(`[Metric] ${metricName} = ${value} (${unit})`);
  }
};

module.exports = {
  recordMetric,
};
