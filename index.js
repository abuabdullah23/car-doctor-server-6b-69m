const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// ============================================================
// ======================= MONGO DB ===========================
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufrxsge.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// verify jwt
const verifyJWT = (req, res, next) => {
    console.log('hitting jwt');
    console.log(req.headers.authorization);
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    console.log('Token inside verifyJWT:', token);
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // select/create db collection to get data from MongoDB
        const servicesCollection = client.db('carDoctorDb').collection('services');
        const checkOutInfoCollection = client.db('carDoctorDb').collection('checkOutInfo');

        // JWT
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
                expiresIn: '10h'
            });
            console.log(token)
            res.send({ token });
        })



        // get all data form server : services data
        app.get('/services', async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // get specific data from db: Noted: have to import ObjectId from mongodb
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, img: 1, service_id: 1 },
            };
            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        })

        // get data for checkout ==============================
        // get specific data via id for checkout
        app.get('/services/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const options = {
                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, img: 1, service_id: 1 },
            };
            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        });

        // // get specific data via id for checkout
        // app.get('/services/checkout', async (req, res) => {
        //     const cursor = servicesCollection.find();
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        // app.get('/services/checkout/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) }

        //     const options = {
        //         // Include only the `title` and `imdb` fields in the returned document
        //         projection: { title: 1, price: 1, img: 1, service_id: 1 },
        //     };
        //     const result = await servicesCollection.findOne(query, options);
        //     res.send(result);
        // });

        // ===========================================================
        //                      Checkout/Booking data
        // ===========================================================
        // to get some checkout info from db: get one person info
        // like: http://localhost:5000/checkout-info?email=assunnah@gmail.com&sort=1
        app.get('/checkout-info', verifyJWT, async (req, res) => {
            // console.log(req.headers.authorization)
            console.log('came back after jwt verify')

            // // secure email
            // if(decoded.email !== req.query.email){
            //     return res.status(403).send({ error: true, message: 'Forbidden access' })
            // }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await checkOutInfoCollection.find(query).toArray();
            res.send(result)
        })

        // check Out or Booking Info route for post
        app.post('/checkout-info', async (req, res) => {
            const checkoutInfo = req.body;
            const result = await checkOutInfoCollection.insertOne(checkoutInfo);
            res.send(result);
        });

        // get specific check Out or Booking cart data
        app.get('/checkout-info/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await checkOutInfoCollection.findOne(query);
            res.send(result);
        })

        // delete check Out or Booking Info one cart by _id
        app.delete('/checkout-info/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await checkOutInfoCollection.deleteOne(query);
            res.send(result);
        })

        // delete check Out or Booking Info one cart by _id
        app.delete('/checkout-info', async (req, res) => {
            const query = { carDoctorDb: { $regex: "checkout-info" } };
            const result = await checkOutInfoCollection.deleteMany(query);
            res.send(result);
        })

        app.patch('/checkout-info/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatingCheckout = req.body;
            const updateDoc = {
                $set: {
                    status: updatingCheckout.status
                },
            };
            const result = await checkOutInfoCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // ===========================================================
        // ===========================================================



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// ======================= MONGO DB ===========================     
// ============================================================


// basic root get method
app.get('/', (req, res) => {
    res.send('Cart Doctor server is running');
})

// listen method
app.listen(port, () => {
    console.log('Server is running on port: ', port)
})