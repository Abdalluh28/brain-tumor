
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler')
const bcrypt = require('bcryptjs');



const updateUserProfile = asyncHandler(async (req, res) => {
    const userInfo = JSON.parse(req.cookies.userInfo);
    const user = await User.findById(userInfo.id);
    console.log('userInfo: ', user)
    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    // update user name
    user.name = req.body.name || user.name;
    
    // update user email
    if (req.body.email) {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(401).json({
                message: 'Email already in use', 
                id: existingUser._id,
                firstName: existingUser.firstName,
                lastName: existingUser.lastName,
                email: existingUser.email,
                isAdmin: existingUser.isAdmin,
                isVerified: existingUser.isVerified
            });
        }
        user.email = req.body.email
    }

    if (req.body.password) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        user.password = hashedPassword
    }


    const updatedUser = await user.save();

    return res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        lastLogin: updatedUser.lastLogin
    })

})


const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    await User.deleteOne({ _id: user._id })

    return res.status(200).json({ message: 'User deleted' })

})



module.exports = { updateUserProfile, deleteUser }