import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  User,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export const ApplicationWizard = () => {
  const { student, refreshStudentProfile } = useAuth();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState([]);
  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    programId: '',
    academicYear: '2026-2027',
    personalDetails: {
      fullName: '',
      dateOfBirth: '',
      gender: 'MALE',
      phone: '',
      email: '',
      fatherName: '',
      motherName: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      },
    },
    academicDetails: {
      tenthBoard: 'CBSE',
      tenthPercentage: 85,
      tenthPassingYear: 2023,
      twelfthBoard: 'CBSE',
      twelfthPercentage: 88.5,
      twelfthPassingYear: 2025,
      twelfthStream: 'Science (PCM)',
      physicsMarks: 88,
      chemistryMarks: 86,
      mathMarks: 92,
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [progRes, appRes] = await Promise.all([
          api.get('/programs'),
          api.get('/applications/me'),
        ]);

        if (progRes.data.success) {
          setPrograms(progRes.data.data);
        }

        if (appRes.data.success && appRes.data.data) {
          setExistingApplication(appRes.data.data);
        } else if (student) {
          // Pre-populate with student registration data
          setFormData((prev) => ({
            ...prev,
            programId: student.selectedProgram?._id || student.selectedProgram || '',
            personalDetails: {
              ...prev.personalDetails,
              fullName: `${student.firstName} ${student.lastName}`.trim(),
              email: student.email,
              phone: student.phone || '',
            },
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/applications', formData);
      if (response.data.success) {
        await refreshStudentProfile();
        navigate('/documents');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Application Submitted</h2>
                <p className="text-xs text-slate-500 font-mono">
                  Application ID: <span className="font-bold text-brand-700">{existingApplication.applicationId}</span>
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {existingApplication.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">Candidate Details</h4>
              <p><strong>Name:</strong> {existingApplication.personalDetails?.fullName}</p>
              <p><strong>Email:</strong> {existingApplication.personalDetails?.email}</p>
              <p><strong>Phone:</strong> {existingApplication.personalDetails?.phone}</p>
              <p><strong>Program:</strong> {existingApplication.program?.name} ({existingApplication.program?.code})</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">Academic Qualifications</h4>
              <p><strong>10th Board & Percentage:</strong> {existingApplication.academicDetails?.tenthBoard} ({existingApplication.academicDetails?.tenthPercentage}%)</p>
              <p><strong>12th Board & Percentage:</strong> {existingApplication.academicDetails?.twelfthBoard} ({existingApplication.academicDetails?.twelfthPercentage}%)</p>
              <p><strong>12th Stream:</strong> {existingApplication.academicDetails?.twelfthStream}</p>
              <p><strong>Submission Date:</strong> {new Date(existingApplication.submissionDate || existingApplication.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => navigate('/documents')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20"
            >
              <span>Go to Document Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Undergraduate Admissions Application Form</h2>
            <p className="text-xs text-slate-500 mt-1">
              Autonomous evaluation & automatic document checklist configuration
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
            Admissions 2026-2027
          </span>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          {/* Section 1: Academic Program & Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-600" />
              1. Select Academic Program & Personal Details
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Degree Program <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.programId}
                onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
              >
                <option value="">Select an accredited degree program</option>
                {programs.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code}) — Fee: ₹{p.tuitionFee?.toLocaleString('en-IN')}/yr | Min 12th: {p.eligibilityCriteria?.minTwelfthMarks}%
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Candidate Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.personalDetails.fullName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, fullName: e.target.value },
                    })
                  }
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.personalDetails.dateOfBirth}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, dateOfBirth: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                <select
                  value={formData.personalDetails.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, gender: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.personalDetails.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, phone: e.target.value },
                    })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.personalDetails.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, email: e.target.value },
                    })
                  }
                  placeholder="student@example.com"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Father's Name</label>
                <input
                  type="text"
                  value={formData.personalDetails.fatherName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, fatherName: e.target.value },
                    })
                  }
                  placeholder="Father's Full Name"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mother's Name</label>
                <input
                  type="text"
                  value={formData.personalDetails.motherName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: { ...formData.personalDetails, motherName: e.target.value },
                    })
                  }
                  placeholder="Mother's Full Name"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Street Address</label>
                <input
                  type="text"
                  value={formData.personalDetails.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: {
                        ...formData.personalDetails,
                        address: { ...formData.personalDetails.address, street: e.target.value },
                      },
                    })
                  }
                  placeholder="Flat / House / Street"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.personalDetails.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: {
                        ...formData.personalDetails,
                        address: { ...formData.personalDetails.address, city: e.target.value },
                      },
                    })
                  }
                  placeholder="City"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={formData.personalDetails.address.pincode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalDetails: {
                        ...formData.personalDetails,
                        address: { ...formData.personalDetails.address, pincode: e.target.value },
                      },
                    })
                  }
                  placeholder="Pincode"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Academic Scores & Qualifications */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              2. Academic Qualifications & Educational Board
            </h3>

            {/* 10th Standard Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">10th Standard / Matriculation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Board <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicDetails.tenthBoard}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, tenthBoard: e.target.value },
                      })
                    }
                    placeholder="e.g. CBSE, ICSE, State Board"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Aggregate % <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.academicDetails.tenthPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, tenthPercentage: parseFloat(e.target.value) || '' },
                      })
                    }
                    placeholder="e.g. 85.5"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Passing Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.academicDetails.tenthPassingYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, tenthPassingYear: parseInt(e.target.value) || '' },
                      })
                    }
                    placeholder="e.g. 2023"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* 12th Standard Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">12th Standard / Higher Secondary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Board <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicDetails.twelfthBoard}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, twelfthBoard: e.target.value },
                      })
                    }
                    placeholder="e.g. CBSE, ISC"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Aggregate % <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.academicDetails.twelfthPercentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, twelfthPercentage: parseFloat(e.target.value) || '' },
                      })
                    }
                    placeholder="e.g. 88.5"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Stream <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicDetails.twelfthStream}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, twelfthStream: e.target.value },
                      })
                    }
                    placeholder="Science (PCM), Commerce, Arts"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Passing Year <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.academicDetails.twelfthPassingYear}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        academicDetails: { ...formData.academicDetails, twelfthPassingYear: parseInt(e.target.value) || '' },
                      })
                    }
                    placeholder="e.g. 2025"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Submit Action */}
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <span>Submit Application & Generate Document Checklist</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
