import React, { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, MapPin, GraduationCap, ShieldCheck, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

export const StudentProfile = () => {
  const { student, refreshStudentProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: student?.phone || '',
    address: {
      street: student?.address?.street || '',
      city: student?.address?.city || '',
      state: student?.address?.state || '',
      pincode: student?.address?.pincode || '',
      country: student?.address?.country || 'India',
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/students/me', formData);
      if (res.data.success) {
        await refreshStudentProfile();
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-extrabold text-lg shadow-md shadow-brand-500/20">
              {student?.firstName?.[0]}
              {student?.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {student?.firstName} {student?.lastName}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Permanent Tracking ID: <span className="font-bold text-brand-700">{student?.trackingId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            {editing ? 'Cancel' : 'Edit Contact Info'}
          </button>
        </div>

        {saved && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile successfully updated</span>
          </div>
        )}

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Personal Info */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Personal & Contact Information
            </h3>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-900">{student?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-semibold text-slate-900">{student?.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Current Stage:</span>
                <span className="font-bold text-brand-700">{student?.currentStage}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Official Enrollment:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {student?.officialEnrollmentNumber || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Snapshot */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              Verified Academic Profile
            </h3>

            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">12th Marks:</span>
                <span className="font-bold text-slate-900">
                  {student?.academicProfile?.twelfthMarks ? `${student.academicProfile.twelfthMarks}%` : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">10th Marks:</span>
                <span className="font-bold text-slate-900">
                  {student?.academicProfile?.tenthMarks ? `${student.academicProfile.tenthMarks}%` : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Enrolled Program:</span>
                <span className="font-semibold text-brand-800">
                  {student?.selectedProgram?.name || 'General Admission'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="p-5 rounded-2xl bg-brand-50/50 border border-brand-200 space-y-4">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">Update Phone & Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
