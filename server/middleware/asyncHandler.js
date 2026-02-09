const asyncHandler = (fn) => async (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch( (error) => {
        return res.status(500).json({message: error.message})
    })
}


module.exports = asyncHandler