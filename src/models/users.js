const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./tasks')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        default: 0
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value) {
            if(value.toLowerCase().includes('password')){
                throw new Error('Password should not include "password" !')
            }
        }
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowerCase: true,
        validate(value) {
            if(!validator.isEmail(value)){
                throw new Error('Please enter valid email id !')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer,
        default: undefined
    }
},{
    timestamps: true
})

userSchema.virtual('tasks', {
    ref: 'Tasks',
    localField: '_id',
    foreignField: 'author'
})

// user defined fnc of instance of a model
userSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET)

    user.tokens = user.tokens.concat({ token})
    await user.save()

    return token
}

// return user without user's password and tokens
userSchema.methods.toJSON = function() {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}

// user defined fnc of a model to verify credentials
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email})
    if(!user){
        throw new Error('Unable to login!')
    }
    
    const isMatch = await bcryptjs.compare(password, user.password)
    if(!isMatch){
        throw new Error('Unable to login!')
    }

    return user
}

//Hashing a password befor saving 
userSchema.pre('save', async function(next) {
    const user = this
    
    if(user.isModified('password')) {
        user.password = await bcryptjs.hash(user.password, 8)
    }

    next()
})

// Delete all tasks created by user before deleting its account
userSchema.pre('remove', async function(next) {
    const user = this
    await Task.deleteMany({ author: user._id})
    next()
})
const User = mongoose.model('User', userSchema)

module.exports = User