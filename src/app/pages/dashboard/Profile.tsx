import { useState } from 'react';
import { User2, ShieldCheck, Save, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export function Profile() {
  const { user, updateSessionUser } = useAuth();

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const onProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const updatedUser = await authAPI.updateProfile(profileForm);
      updateSessionUser({
        fullName: updatedUser.fullName,
        username: updatedUser.username,
        email: updatedUser.email,
      });
      toast.success('Profile details updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setSavingPassword(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 lg:overflow-hidden overflow-y-auto custom-scrollbar">
      <div className="flex-shrink-0">
        <h1 className="text-lg font-bold text-[#1F2937]">My Profile</h1>
        <p className="text-xs text-gray-500">Manage your account details and password</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <User2 size={16} className="text-[#FF6A00]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1F2937]">Account Details</h2>
              <p className="text-[11px] text-gray-500">Update your name, username, and email</p>
            </div>
          </div>

          <form onSubmit={onProfileSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                required
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <Input
                required
                value={profileForm.username}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={savingProfile} className="bg-[#FF6A00] hover:bg-[#E55F00]">
                <Save size={14} className="mr-1.5" />
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <KeyRound size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1F2937]">Change Password</h2>
              <p className="text-[11px] text-gray-500">Use a strong password with at least 8 characters</p>
            </div>
          </div>

          <form onSubmit={onPasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <Input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <Input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <Input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button type="submit" disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700">
                <ShieldCheck size={14} className="mr-1.5" />
                {savingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
