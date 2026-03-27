const prisma = require('../db');

const VALID_RESIDENT_STATUSES = new Set(['active', 'archived']);

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const validateRequiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: `${label} is required` };
  }

  return { value: value.trim() };
};

const validateOptionalString = (value, label, { allowEmpty = false } = {}) => {
  if (typeof value !== 'string') {
    return { error: `${label} must be a string` };
  }

  const trimmedValue = value.trim();
  if (!allowEmpty && !trimmedValue) {
    return { error: `${label} is required` };
  }

  return { value: trimmedValue };
};

const validateHouseholdCount = (value, { required = false } = {}) => {
  if (value === undefined) {
    return required
      ? { error: 'Valid household count is required' }
      : { value: undefined };
  }

  const parsedValue = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return { error: 'Valid household count is required' };
  }

  return { value: parsedValue };
};

const validateResidentStatus = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'Status is required' };
  }

  const normalizedStatus = value.trim().toLowerCase();
  if (!VALID_RESIDENT_STATUSES.has(normalizedStatus)) {
    return { error: 'Invalid resident status' };
  }

  return { value: normalizedStatus };
};

// Get all residents
exports.getAllResidents = async (req, res) => {
  try {
    const residents = await prisma.resident.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(residents);
  } catch (error) {
    console.error('Get all residents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single resident
exports.getResidentById = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await prisma.resident.findUnique({
      where: { id }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    res.json(resident);
  } catch (error) {
    console.error('Get resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create resident
exports.createResident = async (req, res) => {
  try {
    const { residentName, address, contactNumber, emergencyContact, householdCount, notes } = req.body;

    const validatedName = validateRequiredString(residentName, 'Resident name');
    if (validatedName.error) {
      return res.status(400).json({ error: validatedName.error });
    }

    const validatedAddress = validateRequiredString(address, 'Address');
    if (validatedAddress.error) {
      return res.status(400).json({ error: validatedAddress.error });
    }

    const validatedContactNumber = validateRequiredString(contactNumber, 'Contact number');
    if (validatedContactNumber.error) {
      return res.status(400).json({ error: validatedContactNumber.error });
    }

    const validatedEmergencyContact = validateRequiredString(emergencyContact, 'Emergency contact');
    if (validatedEmergencyContact.error) {
      return res.status(400).json({ error: validatedEmergencyContact.error });
    }

    const validatedHouseholdCount = validateHouseholdCount(householdCount, { required: true });
    if (validatedHouseholdCount.error) {
      return res.status(400).json({ error: validatedHouseholdCount.error });
    }

    let normalizedNotes = '';
    if (notes !== undefined && notes !== null) {
      const validatedNotes = validateOptionalString(notes, 'Notes', { allowEmpty: true });
      if (validatedNotes.error) {
        return res.status(400).json({ error: validatedNotes.error });
      }
      normalizedNotes = validatedNotes.value;
    }

    const resident = await prisma.$transaction(async (tx) => {
      const createdResident = await tx.resident.create({
        data: {
          residentName: validatedName.value,
          address: validatedAddress.value,
          contactNumber: validatedContactNumber.value,
          emergencyContact: validatedEmergencyContact.value,
          householdCount: validatedHouseholdCount.value,
          notes: normalizedNotes,
          status: 'active'
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.userId,
          userName: req.user.fullName,
          action: 'Resident Added',
          target: createdResident.residentName,
          details: 'Added new resident to directory'
        }
      });

      return createdResident;
    });

    res.status(201).json(resident);
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update resident
exports.updateResident = async (req, res) => {
  try {
    const { id } = req.params;
    const existingResident = await prisma.resident.findUnique({
      where: { id }
    });

    if (!existingResident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    const updateData = {};

    if (hasOwn(req.body, 'residentName')) {
      const validatedName = validateRequiredString(req.body.residentName, 'Resident name');
      if (validatedName.error) {
        return res.status(400).json({ error: validatedName.error });
      }
      updateData.residentName = validatedName.value;
    }

    if (hasOwn(req.body, 'address')) {
      const validatedAddress = validateRequiredString(req.body.address, 'Address');
      if (validatedAddress.error) {
        return res.status(400).json({ error: validatedAddress.error });
      }
      updateData.address = validatedAddress.value;
    }

    if (hasOwn(req.body, 'contactNumber')) {
      const validatedContactNumber = validateRequiredString(req.body.contactNumber, 'Contact number');
      if (validatedContactNumber.error) {
        return res.status(400).json({ error: validatedContactNumber.error });
      }
      updateData.contactNumber = validatedContactNumber.value;
    }

    if (hasOwn(req.body, 'emergencyContact')) {
      const validatedEmergencyContact = validateRequiredString(req.body.emergencyContact, 'Emergency contact');
      if (validatedEmergencyContact.error) {
        return res.status(400).json({ error: validatedEmergencyContact.error });
      }
      updateData.emergencyContact = validatedEmergencyContact.value;
    }

    if (hasOwn(req.body, 'householdCount')) {
      const validatedHouseholdCount = validateHouseholdCount(req.body.householdCount, { required: true });
      if (validatedHouseholdCount.error) {
        return res.status(400).json({ error: validatedHouseholdCount.error });
      }
      updateData.householdCount = validatedHouseholdCount.value;
    }

    if (hasOwn(req.body, 'notes')) {
      if (req.body.notes === null) {
        updateData.notes = '';
      } else {
        const validatedNotes = validateOptionalString(req.body.notes, 'Notes', { allowEmpty: true });
        if (validatedNotes.error) {
          return res.status(400).json({ error: validatedNotes.error });
        }
        updateData.notes = validatedNotes.value;
      }
    }

    if (hasOwn(req.body, 'status')) {
      const validatedStatus = validateResidentStatus(req.body.status);
      if (validatedStatus.error) {
        return res.status(400).json({ error: validatedStatus.error });
      }
      updateData.status = validatedStatus.value;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid resident fields provided for update' });
    }

    const statusChanged = updateData.status && updateData.status !== existingResident.status;
    const action = statusChanged
      ? updateData.status === 'archived'
        ? 'Resident Archived'
        : 'Resident Restored'
      : 'Resident Updated';
    const details = statusChanged
      ? updateData.status === 'archived'
        ? 'Moved resident to archive'
        : 'Restored resident from archive'
      : 'Updated resident information';

    const resident = await prisma.$transaction(async (tx) => {
      const updatedResident = await tx.resident.update({
        where: { id },
        data: updateData
      });

      await tx.auditLog.create({
        data: {
          userId: req.userId,
          userName: req.user.fullName,
          action,
          target: updatedResident.residentName,
          details
        }
      });

      return updatedResident;
    });

    res.json(resident);
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete resident
exports.deleteResident = async (req, res) => {
  try {
    const { id } = req.params;

    const resident = await prisma.resident.findUnique({
      where: { id }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    if (resident.status !== 'archived') {
      return res.status(400).json({ error: 'Resident must be archived before permanent deletion' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.resident.delete({
        where: { id }
      });

      await tx.auditLog.create({
        data: {
          userId: req.userId,
          userName: req.user.fullName,
          action: 'Resident Deleted',
          target: resident.residentName,
          details: 'Removed resident from directory'
        }
      });
    });

    res.json({ message: 'Resident deleted successfully' });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
