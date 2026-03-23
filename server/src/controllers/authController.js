const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Log the login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userName: user.fullName,
        action: 'User Login',
        target: user.email,
        details: 'User logged in successfully'
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout (client-side token removal, but we log it)
exports.logout = async (req, res) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        userName: req.user.fullName,
        action: 'User Logout',
        target: req.user.email,
        details: 'User logged out'
      }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update current user's profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, fullName } = req.body;

    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFullName = String(fullName).trim();

    if (!normalizedUsername || !normalizedEmail || !normalizedFullName) {
      return res.status(400).json({ error: 'Username, email, and full name are required' });
    }

    const conflictingUser = await prisma.user.findFirst({
      where: {
        id: { not: req.userId },
        OR: [
          { username: normalizedUsername },
          { email: normalizedEmail }
        ]
      }
    });

    if (conflictingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        username: normalizedUsername,
        email: normalizedEmail,
        fullName: normalizedFullName
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        userName: updatedUser.fullName,
        action: 'Profile Updated',
        target: updatedUser.email,
        details: 'User updated account details'
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change current user's password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashedPassword }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        userName: user.fullName,
        action: 'Password Changed',
        target: user.email,
        details: 'User changed account password'
      }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
