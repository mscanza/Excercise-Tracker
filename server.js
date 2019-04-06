const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true })

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
const exerciseSchema = new mongoose.Schema({
description: {type: String, required: [true, 'Must include Description']},
 duration: {type: Number, min: [1, 'You have to workout atleast 1 minute!']},
  date: {type: Date, default: Date.now()}
})
const userSchema = new mongoose.Schema({
username: String,
  _id: String,
  count: Number,
  log: [exerciseSchema]
  
})
const userModel = mongoose.model('userModel', userSchema)

app.post('/api/exercise/new-user', function(req,res) {
userModel.findOne({username: req.body.username}, function(err,data) {
if (err) return err;
  if (data) {
  res.send("Username already exists")
  } else {
  var newUser =  new userModel({username: req.body.username, _id: shortid.generate()})
  newUser.save(function(err,data) {
  if (err) return err;
  res.json({"username": newUser.username, "_id": newUser._id})
  })
  }
})
})



app.post('/api/exercise/add', function(req,res) {
userModel.findById(req.body.userId, function(err, data) {
if (err) return err;
  if (!data) {
  res.send("Cannot find User Id")
  } else if (data) {
    if (!req.body.description) {
    res.send('Description is required.')
    } else if (Number(req.body.duration) < 1 || Number(req.body.duration) == NaN || !req.body.duration) {
    res.send('Duration must be a number greater than 1.')
    } else if (req.body.date === '') {
         req.body.date = new Date()      
      } else if (new Date(req.body.date) == 'Invalid Date') {
    res.send('Please enter a valid date.')
    }
  data.log.push({description: req.body.description, duration: Number(req.body.duration), date: new Date(req.body.date)})
    data.markModified('log.date')
    data.save(function(err, data) {
    if (err) return err;
    res.json({"username": data.username, "_id": data._id, "description": req.body.description, "duration": Number(req.body.duration), "date": new Date(req.body.date).toDateString()})
    })
  }
})
})

app.get('/api/exercise/:log', function(req,res) {
userModel.findById(req.query.userId, function(err, data) {
if (err) return err;
  if (!data) {
  res.send("Cannot find user data.")
  } else if (data) {
    let mapped = data.log.map(item => ({"description": item.description, "duration": item.duration, "date": new Date(item.date)})).sort((a,b) => new Date(b.date) - new Date(a.date))
    
    if (req.query.from) {
      if (new Date(req.query.from) == 'Invalid Date') {
      return res.send('Please enter a valid "from" date.')
      } else {
      mapped = mapped.filter(item => item.date >= new Date(req.query.from))
      }
    } 
    
   if (req.query.to) {
      if (new Date(req.query.to) == 'Invalid Date') {
        return  res.send('Please enter a valid "to" date.')
        } else {
        mapped = mapped.filter(item => item.date <= new Date(req.query.to))
        }
   }
    if (req.query.limit && Number(req.query.limit) !== NaN) {
    mapped = mapped.splice(0,Number(req.query.limit))
    }
    
    mapped = mapped.map(item => ({"description": item.description, "duration": item.duration, "date": new Date(item.date).toDateString()})).sort((a,b) => new Date(b.date) - new Date(a.date))
    res.json({"username": data.username, "_id": data._id, "count": mapped.length, "log": mapped})   
  }
})
})


// app.get('/api/exercise/:log', function(req,res) {
// userModel.findById(req.query.userId, function(err, data) {
// if (err) return err;
//   if (!data) {
//   res.send("Cannot find user data.")
//   } else if (data) {
//     if (req.query.limit) {
//       data.log.
//     }
    
//     const mapped = data.log.map(item => ({"description": item.description, "duration": item.duration, "date": new Date(item.date).toDateString()})).sort((a,b) => new Date(b.date) - new Date(a.date))
//     res.json({"username": data.username, "_id": data._id, "count": data.log.length, "log": mapped})   
//   }
// })
// })


app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
