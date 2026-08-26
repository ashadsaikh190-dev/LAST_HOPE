const { generateTrackingId, generateApplicationId, generatePaymentId } = require('../src/utils/idGenerator');
const { calculateStringSimilarity, compareExtractedWithApplication } = require('../src/utils/fuzzyMatch');

describe('Deterministic ID Generation & Format Tests', () => {
  test('generateTrackingId produces STU-YYYY-XXXXX format', () => {
    const trackingId = generateTrackingId();
    const year = new Date().getFullYear();
    expect(trackingId).toMatch(new RegExp(`^STU-${year}-[A-Z0-9]{5}$`));
  });

  test('generateApplicationId produces APP-YYYY-XXXXX format', () => {
    const appId = generateApplicationId();
    const year = new Date().getFullYear();
    expect(appId).toMatch(new RegExp(`^APP-${year}-[A-Z0-9]{5}$`));
  });

  test('generatePaymentId produces PAY-YYYY-XXXXXXX format', () => {
    const payId = generatePaymentId();
    const year = new Date().getFullYear();
    expect(payId).toMatch(new RegExp(`^PAY-${year}-[A-Z0-9]{7}$`));
  });
});

describe('Fuzzy Matching & OCR Consistency Validation', () => {
  test('calculateStringSimilarity returns 100 for exact match', () => {
    expect(calculateStringSimilarity('Rahul Kumar', 'Rahul Kumar')).toBe(100);
  });

  test('calculateStringSimilarity handles minor OCR typos', () => {
    const sim = calculateStringSimilarity('Rahul Kumar', 'Rahul Kumr');
    expect(sim).toBeGreaterThanOrEqual(85);
  });

  test('compareExtractedWithApplication flags significant mismatches', () => {
    const extractedData = {
      name: 'Amit Verma',
      percentage: 65.0,
      passingYear: 2024,
    };
    const application = {
      personalDetails: { fullName: 'Rahul Kumar' },
      academicDetails: { twelfthPercentage: 90.0, twelfthPassingYear: 2025 },
    };

    const comparison = compareExtractedWithApplication(extractedData, application);
    expect(comparison.mismatches.length).toBeGreaterThan(0);
    expect(comparison.recommendedStatus).toBe('MISMATCH');
  });
});
