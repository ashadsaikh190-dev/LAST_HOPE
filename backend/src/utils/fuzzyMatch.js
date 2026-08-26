/**
 * Fuzzy Matching and OCR Data Consistency Validation
 * Calculates similarity between Application details and Document OCR extracted values
 */

const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const levenshteinDistance = (a, b) => {
  const s1 = normalizeString(a);
  const s2 = normalizeString(b);

  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  return matrix[s2.length][s1.length];
};

const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  if (s1 === s2) return 100;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(s1, s2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.round(similarity * 10) / 10;
};

const compareExtractedWithApplication = (extractedData, application) => {
  const mismatches = [];
  let totalScore = 0;
  let checks = 0;

  // 1. Name Check
  if (extractedData.name && application.personalDetails?.fullName) {
    checks++;
    const nameSim = calculateStringSimilarity(
      extractedData.name,
      application.personalDetails.fullName
    );
    totalScore += nameSim;
    if (nameSim < 85) {
      mismatches.push({
        field: 'fullName',
        applicationValue: application.personalDetails.fullName,
        documentValue: extractedData.name,
        matchScore: nameSim,
        isSignificant: nameSim < 70,
      });
    }
  }

  // 2. Marks / Percentage Check
  if (extractedData.percentage !== undefined && application.academicDetails) {
    checks++;
    const appPct =
      application.academicDetails.twelfthPercentage ||
      application.academicDetails.tenthPercentage;
    const diff = Math.abs(extractedData.percentage - appPct);
    const score = Math.max(0, 100 - diff * 10);
    totalScore += score;

    if (diff > 1.0) {
      mismatches.push({
        field: 'percentage',
        applicationValue: `${appPct}%`,
        documentValue: `${extractedData.percentage}%`,
        matchScore: score,
        isSignificant: diff > 5.0,
      });
    }
  }

  // 3. Passing Year Check
  if (extractedData.passingYear && application.academicDetails) {
    checks++;
    const appYear =
      application.academicDetails.twelfthPassingYear ||
      application.academicDetails.tenthPassingYear;
    const isExact = Number(extractedData.passingYear) === Number(appYear);
    const score = isExact ? 100 : 0;
    totalScore += score;

    if (!isExact) {
      mismatches.push({
        field: 'passingYear',
        applicationValue: String(appYear),
        documentValue: String(extractedData.passingYear),
        matchScore: score,
        isSignificant: true,
      });
    }
  }

  const confidenceScore = checks > 0 ? Math.round(totalScore / checks) : 85;

  let recommendedStatus = 'VERIFIED';
  if (mismatches.some((m) => m.isSignificant)) {
    recommendedStatus = confidenceScore < 60 ? 'MISMATCH' : 'NEEDS_REVIEW';
  } else if (mismatches.length > 0) {
    recommendedStatus = 'NEEDS_REVIEW';
  }

  return {
    confidenceScore,
    recommendedStatus,
    mismatches,
  };
};

module.exports = {
  calculateStringSimilarity,
  compareExtractedWithApplication,
};
