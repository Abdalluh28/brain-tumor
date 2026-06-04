const buildUserInfo = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    radiologyCenterId: user.radiologyCenterId
        ? user.radiologyCenterId.toString()
        : null,
});

module.exports = buildUserInfo;
