const express = require('express');
const app = express();
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dnqomnb.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // await client.connect();

    const itemsCollection = client.db("theProperty").collection("items");
    const wishlistCollection = client.db("theProperty").collection("addToWishlist");
    const offerCollection = client.db("theProperty").collection("offer");
    const userCollection = client.db("theProperty").collection("user");

    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '2d'
      });
      res.send({ token })
    })


    // verify token
    const verifyToken = (req, res, next) => {
      console.log('verify token ', req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'Unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }


    // verifyAdmin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const admin = user?.role === 'admin';
      if (!admin) {

        return res.status(403).send({ message: 'Forbidden access' })
      }
      next()
    }


    // get admin api
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' })

      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role == 'admin';
      }
      res.send({ admin })

    })

    // Agent role api


    app.get('/user/agent/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' })

      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let agent = false;
      if (user) {
        agent = user?.role == 'agent';
      }
      res.send({ agent })

    })


    // property api
    app.post("/items", async (req, res) => {
      const items = req.body;
      const result = await itemsCollection.insertOne(items);
      res.send(result);
      console.log(items, result);
    });

    app.get('/items', async (req, res) => {
      const result = await itemsCollection.find().toArray();
      res.send(result);
    })

    app.get('/items/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await itemsCollection.findOne(query);
      res.send(result);
    })


    
    // wishlist data post
    app.post("/addToWishlist", async (req, res) => {
      const wishlist = req.body;
      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
      console.log(wishlist, result);
    });

    app.get('/ToWishlist', async (req, res) => {
      const result = await wishlistCollection.find().toArray();
      res.send(result);
    })
    app.get('/ToWishlist/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    })

    app.get('/addToWishlist', async (req, res) => {
      const email = req.query.email;
      const query = { wishedEmail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });
    app.delete('/ToWishlist/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result)
    })

    // user data
    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existing = await userCollection.findOne(query);
      if (existing) {
        res.send({ message: 'user already exist', insertedId: null })
      }
      else {
        const result = await userCollection.insertOne(user);
        res.send(result);
      }


    })

    app.get('/item', async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email }
      const result = await itemsCollection.find(query).toArray();
      res.send(result);
    })

    // update signle prop

    app.get('/item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await itemsCollection.findOne(query)
      res.send(result)
  });

  app.put('/item/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const options = { upsert: true };
    const updateProp = req.body;
    const updateDoc = {
        $set: {
          image:updateProp.image,
          title:updateProp.title,
          agent_name:updateProp.agent_name,
          agent_image:updateProp.agent_image,
          location:updateProp.location,
          user_email:updateProp.user_email,
          Max_price:updateProp.Max_price,
          Min_Price:updateProp.Min_Price,
          category:updateProp.category,

        },
        // image, title, agent_name, agent_image, location, user_email, Max_price, Min_Price, category
    };
    const result = await itemsCollection.updateOne(query, updateDoc,options)
    res.send(result)
});





    app.get('/user', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })
    app.get('/oneUser', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await userCollection.findOne(query);
      res.send(result);
    })

    // delete user 
    app.delete('/user/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })

    // admin role 

    app.patch('/user/admin/:id', verifyAdmin, verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result)

    })

    // Agent role
    app.patch('/user/agent/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'agent'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result)

    })



    // offer post
    app.post("/makeoffer", async (req, res) => {
      const offers = req.body;
      const result = await offerCollection.insertOne(offers);
      res.send(result);
      console.log(offers, result);
    });
    app.get('/offerlist', async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };
      const result = await offerCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/offers', async (req,res)=>{
      const result = await offerCollection.find().toArray();
      res.send(result)
    })

    app.patch('/offers/accept/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'Accepted'
        }
      }
      const result = await offerCollection.updateOne(query, updatedDoc);
      res.send(result)

    })

    app.patch('/offers/reject/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'Rejected'
        }
      }
      const result = await offerCollection.updateOne(query, updatedDoc);
      res.send(result)

    })


    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('The property is running')
})

app.listen(port, () => {
  console.log(`The property running port is: ${port}`)
})