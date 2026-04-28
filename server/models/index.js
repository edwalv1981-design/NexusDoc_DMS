const User = require('./User');
const AuditLog = require('./AuditLog');
const FormData = require('./FormData');
const PendingRegistration = require('./PendingRegistration');

const DocumentTemplate = require('./DocumentTemplate');

// Relationships
User.hasMany(FormData, { foreignKey: 'userId' });
FormData.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  User,
  AuditLog,
  FormData,
  PendingRegistration,
  DocumentTemplate
};

