import express from 'express';
import mongoose from 'mongoose';
import { User } from './model/user.js';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import jwt from "jsonwebtoken";

const PORT = 3000; 

const url = 'mongodb+srv://Ruslan:0299ee1988@cluster0.wliu6oq.mongodb.net/clients';

const app = express();

const csrfProtection  = csurf({ cookie: true});

const secretKey = "secretKey";

app.use(express.static('css'));
app.use(express.urlencoded({extended: true}));

app.use(cookieParser());

app.set('view engine', 'pug');

mongoose.connect(url)
        .then(()=> {
            console.log('Connected to DB');
            app.listen(PORT, ()=> {
                console.log(`Server started on http://localhost:${PORT}`);
            })
        })
        .catch((err)=> {console.log(`DB connection error: ${err}`)});

app.post("/set-cookie", csrfProtection, async (req, res,) => {
    const {name, password} = req.body;
    if (name == "admin" && password == "123") {
        const token = jwt.sign({ name}, secretKey, { expiresIn: "1h"});
        res.cookie("token", token);
        res.cookie("username", name);
        res.redirect("/");
    } else {
        res.redirect("/login")
    }
});

app.get("/logout", (req, res) => {
    res.clearCookie("username");
    res.clearCookie("token");
    res.redirect("/")
})

const checkToken = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Invalid token"});
            } else {
                next();
            }
        });
    } else {
        return res.status(401).json({ message: "Token not found"})
    }
};

app.get('/', async (req, res) => {
    try {
        const title = {}
        let isAdmin = false;
        if (req.cookies.username) {
            title.text = `You are in administrator mode, to logout press`;
            title.link = "http://localhost:3000/logout";
            title.linkMessage = "log out";
            isAdmin = true;
        } else {
            title.text = "If you are admin please";
            title.link = "http://localhost:3000/login";
            title.linkMessage = "log in";
            isAdmin = false;
        }
        const users = await User.find();
        res.render('index', {users, title, isAdmin});
    } catch (err){
        console.log(err);
    }
});

app.post('/add', csrfProtection, async (req, res) => {
    try{
        const user = new User(req.body);
        await user.save();
        res.redirect('/');
    } catch(err){
        console.log(err);
    }
});

app.get('/edit/:id', checkToken, async (req, res)=> {
    try{
        const user = await User.findById(req.params.id)
        res.render('edit', {user});
    } catch(err){
        console.log(err);
    }
});

app.post('/change-user/:id', async (req, res)=> {
    try{
        await User.findByIdAndUpdate(req.params.id, req.body);
        res.redirect('/');
    } catch(err){
        console.log(err);
    }
});

app.delete('/remove/:id', async (req, res)=> {
    try{
        await User.deleteOne({_id: req.params.id})
        res.status(200).json({ message: 'User deleted' });
    } catch(err){
        console.log(err);
    }
});

app.get('/login', csrfProtection, (req, res) => {
    res.render('login', { csrfToken: req.csrfToken() })
});
