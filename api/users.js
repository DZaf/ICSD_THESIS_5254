const Joi = require('joi'); //ΤΟ ΧΡΗΣΙΜΟΠΟΙΟΥΜΕ ΓΙΑ ΤΟ VALIDATION
const User = require('../mongo-models/user-model');
const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

mongoose.connect('mongodb+srv://admin:admin@thesis-cluster-9doea.mongodb.net/test?retryWrites=true', {
    useNewUrlParser: true
});

// router.get('/',(req,res)=>{
//     res.send('hello Users!!!')
// });

//---------------------------------GET--------------------------------
router.get('/', (req, res) => {
    User.find()
        .select()
        .exec()
        .then(docs => {
            const response = {
                count: docs.length,
                users: docs.map(doc => {
                    return {
                        _id: doc._id,
                        name: doc.name,
                        surname: doc.surname,
                        email: doc.email,
                        password: doc.password
                    }
                })
            };
            res.status(200).json(response);
        })
});

//-----------------------------------POST------------------------------
router.post('/register', (req, res) => {
    //req.headers("Access-Control-Allow-Origin: *");
    //res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(req.body);

    const result = validateUser(req.body); // Καλούμε την validateUser για να κάνουμε validate την είσοδο που παίρνουμε
    // ΑΝ ΤΟ ΠΟΤΕΛΕΣΜΑ ΕΧΕΙ ERROR ΤΟΤΕ ΕΠΙΣΤΡΕΦΟΥΜΕ 400
    if (result.error) return res.status(400).send({
        success: 'false',
        message: result.error.details[0].message
    });

    checkUser(req.body.email).then((userExists) => {
        console.log(userExists);
        if (userExists) return res.status(401).send({
            success: 'false',
            message: `user with email ${req.body.email} exists`
        });

    }, function () {
        console.log("error");
    })






    bcrypt.hash(req.body.password, 10, function (err, hash) { //Χρησημοποιούμε την bcrypt.hash για να χασάρουμε τον κωδικό του χρήστη και μέσα σε αυτήν βάζουμε το αντικείμενο user στην βάση

        const user = new User({ // Δημιουργούμε ένα νέο αντικείμενο User το οποίο θα μπει στην βάση και του δίνουμε τις τιμές από το request του client και το objectId που δημιουργεί αυτόματα η mongoose
            _id: new mongoose.Types.ObjectId(),
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: hash
        });

        user // Κάνουμε save για να αποθηκευτεί στη βάση και μετά επιστρέφουμε κατάλληλο μήνυμα αν όλα πήγαν καλά και αντίστοιχα αν προέκυψε σφάλμα
            .save()
            .then(result => {

                console.log(result);
                res.status(200).json({
                    success: 'true',
                    message: 'User created successfully',
                    createdUser: result
                });
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    success: 'false',
                    message: err
                });
            });

    });


});

//-----------------------------------POST LOGIN------------------------------
router.post('/login', (req, res) => {

    const result = validateUserLogin(req.body); // Καλούμε την validateUserLogin για να κάνουμε validate την είσοδο που παίρνουμε
    // ΑΝ ΤΟ ΠΟΤΕΛΕΣΜΑ ΕΧΕΙ ERROR ΤΟΤΕ ΕΠΙΣΤΡΕΦΟΥΜΕ 400
    if (result.error) return res.status(400).send({
        success: 'false',
        message: result.error.details[0].message
    });

    checkUser(req.body.email).then((userExists) => {
        if (userExists) {
            bcrypt.hash(req.body.password, 10, function (err, hash) {
                checkPassword(req.body.email, hash)
                    .then((correctPassword) => {
                        if (!correctPassword) {
                            return res.status(400).send({ success: 'false', message: "incorrect password" });
                        }
                        else {
                            return res.status(200).send({ success: 'true', message: correctPassword });
                        }
                    })
            });
        } else {
            return res.status(401).send({
                success: 'false',
                message: `user with email ${req.body.email} doesn't exists`
            });
        }
    });

});

function validateUserLogin(user) {
    // ΔΗΜΙΟΥΡΓΟΥΜΕ ΕΝΑ ΠΡΟΤΥΠΟ ΓΙΑ ΤΟ ΠΩΣ ΘΕΛΟΥΜΕ ΝΑ ΕΙΝΑΙ ΤΑ ΔΕΔΟΜΕΝΑ ΠΟΥ ΘΑ ΠΑΡΟΥΜΕ
    const schema = {
        // ΓΙΑ ΠΑΡΑΔΕΙΓΜΑ ΤΟ NAME ΠΡΕΠΕΙ ΝΑ ΕΧΕΙ ΤΟ ΛΙΓΟΤΕΡΟ 3 ΓΡΑΜΜΑΤΑ ΚΑΙ ΕΙΝΑΙ ΥΠΟΧΡΕΩΤΙΚΟ
        email: Joi.string().email().required(),
        password: Joi.string().min(3).required(),
    };
    // ΕΛΕΓΧΟΥΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΠΟΥ ΠΑΙΡΝΟΥΜΕ ΜΕ ΤΟ ΠΡΟΤΥΠΟ(SCHEMA)
    return Joi.validate(user, schema);
}

function checkPassword(user_email, user_password) {
    console.log(user_password);
    return User.find({
        email: user_email,
        password: user_password
    }).select()
        .exec()
        .then(docs => {
            const response = {
                count: docs.length,
                users: docs.map(doc => {
                    return {
                        _id: doc._id,
                        name: doc.name,
                        surname: doc.surname,
                        email: doc.email,
                        password: doc.password
                    }
                })
            };
            if (response.count == 0) {
                return false;
            } else {
                return response.users[0];
            }
        })


    // .then(docs => {
    //     if (docs) {

    //         return docs;
    //     } else {
    //         return false;
    //     }
    // });
}



function validateUser(user) {
    // ΔΗΜΙΟΥΡΓΟΥΜΕ ΕΝΑ ΠΡΟΤΥΠΟ ΓΙΑ ΤΟ ΠΩΣ ΘΕΛΟΥΜΕ ΝΑ ΕΙΝΑΙ ΤΑ ΔΕΔΟΜΕΝΑ ΠΟΥ ΘΑ ΠΑΡΟΥΜΕ
    const schema = {
        // ΓΙΑ ΠΑΡΑΔΕΙΓΜΑ ΤΟ NAME ΠΡΕΠΕΙ ΝΑ ΕΧΕΙ ΤΟ ΛΙΓΟΤΕΡΟ 3 ΓΡΑΜΜΑΤΑ ΚΑΙ ΕΙΝΑΙ ΥΠΟΧΡΕΩΤΙΚΟ
        name: Joi.string().min(3).required(),
        surname: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(3).required(),
    };
    // ΕΛΕΓΧΟΥΜΕ ΤΑ ΔΕΔΟΜΕΝΑ ΠΟΥ ΠΑΙΡΝΟΥΜΕ ΜΕ ΤΟ ΠΡΟΤΥΠΟ(SCHEMA)
    return Joi.validate(user, schema);
}

function checkUser(user_email) {

    return User.findOne({
        email: user_email
    }).then(docs => {
        if (docs) {
            console.log("iparxei");
            return true;
        } else {
            console.log("dn iparxei");
            return false;
        }
    });
}
module.exports = router;