const express = require('express');
const cors = require('cors')//cors for own server connected with own
const app = express();
const admin = require("firebase-admin");
require("dotenv").config();//dotenv config
const port = process.env.PORT || 5000;

//Middleware
app.use(cors());
app.use(express.json());

//////////////////////////// Mongodb Server Uri and Client ////////////////////////////
const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i6saz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


////////////////// Token Verify Function /////////////
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers?.authorization.split(' ')[1];
    console.log(token);
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {
      
    }
  }
  next();
}

/////////////////// Main Function Start ///////////////////////////////
async function run() {
    try {
      await client.connect();
      const database = client.db("final-project2");
      const bookingCollection = database.collection("appointments");
      const usersCollection = database.collection("users");

      
///////////////////// Get All Data From Database From Ui  ///////////////////////
      app.get('/appointments',verifyToken, async (req, res) => {
        const email = req.query.email;
        const date =new Date(req.query.date).toLocaleDateString();
        const query = {email: email,date:date}
        const cursor = bookingCollection.find(query);
        const appointments = await cursor.toArray()
        res.json(appointments);
      })
/////////////////////////////////////////////////////////////////////


/////////////////////// Post Appointment Data To database Api ////////////////
      app.post('/appointments', async (req, res) => {
        const appointmentData = req.body
        const result = await bookingCollection.insertOne(appointmentData)
             res.json(result)
            //  console.log(result)
      })     
////////////////////////////////////////////////////////////////////


//////////////////////// Check Admin  /////////////////////      
  app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = {email: email}
    const user = await usersCollection.findOne(query);
  // console.log(user);
    if (user?.role === "admin") {
      
      res.json({admin:true});
    }
    else {
      res.json({admin:false});
    }
        
      })     
////////////////////////////////////////////////////////////////////
      

//////////////////// Save User To database api /////////////////////
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user)
        res.json(result)
    })
///////////////////////////////////////////////////////////// ////////
      
      
////////////////////// Save Google User To database api ////////////////////////
      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user }
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result)     
      });
/////////////////////////////////////////////////////////////////

      

//  final-project2-firebase-adminsdk.json     

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
      

////////////////////// Save Admin Role To database api ////////////////////////
      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        // console.log(req.decodedEmail);
        const requester = req.decodedEmail
        if (requester ) {
          const requesterEmail = await usersCollection.findOne({ email: requester });
          if (requesterEmail.role === 'admin') {
            const filter = { email: user.email }
        const updateDoc = { $set: {role:'admin'} }
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result)  
          }
        }
        else {
          res.status(403).json({message:' You do not have permission to  make an admin'})
        }
           
      });
/////////////////////////////////////////////////////////////////

    }
     finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


///////////////////////////////////////////////////////////
app.get('/',(req,res) =>{
    res.send('Server is ok')
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
//////////////////////////////// End //////////////////////////////////