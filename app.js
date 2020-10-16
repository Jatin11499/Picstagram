require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const multer = require('multer');

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB,{
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

var imageSchema = new mongoose.Schema({  
    img: 
    { 
        data: Buffer, 
        contentType: String 
    },
    caption: String,
    likes: Number,
    comments: [{
        username: String,
        com: String
    }]
});

const Image = new mongoose.model("image", imageSchema);

const userSchema = new mongoose.Schema({
    email: String,
    fullname: String,
    username: String,
    bio: String,
    password: String,
    profilepic: imageSchema,
    posts: [imageSchema],
    followers: [String],
    following: [String],
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); 
  
let storage = multer.diskStorage({ 
    destination: (req, file, cb) => { 
        cb(null, './public/uploads/');
    }, 
    filename: (req, file, cb) => { 
        cb(null, file.fieldname + '-' + Date.now());
    } 
});
  
let upload = multer({ storage: storage });

app.get("/",function(req,res){
    res.render("index");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",upload.single('image'),function(req,res,next){
    let filePath = './public/uploads/' + req.file.filename;

    let obj = { 
        img: {
            data: fs.readFileSync(filePath), 
            contentType: 'image/png'
        },
        caption: "",
        likes: 0,
        comments: [] 
    }

    User.register({username: req.body.username, fullname: req.body.fullname, bio: "", email: req.body.email, profilepic: obj, posts: [], followers: [], following: []}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home?uname="+req.body.username+"&fname="+req.body.fullname);
            });
        }
    });
});

app.get("/login",function(req,res){
    res.render("login");
});

app.post("/login",function(req,res){
    const u = req.body.username;
    const p = req.body.password;
    let fn = "";

    User.findOne({username: u}, function(err, data){
        if(err){
            console.log(err);
        }
        else{
            if(data){
                fn = data.fullname;
            }
            else{
                res.redirect("/register");
            }
        }
    });

    const user = new User({
        username: u,
        password: p
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/home?uname="+u+"&fname="+fn);
            });
        }
    });
});

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

app.get("/home",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;

    if(req.isAuthenticated()){
        User.findOne({username: u}, function(err,data){
            if(err){
                console.log(err);
            }
            else
            {
                let arr = data.following;
                let accuname = [];
                let accpp = [];
                let accpost = [];

                if(arr.length === 0){
                    res.render("home",{
                        username: u,
                        fullname: f,
                        accunamearr: accuname,
                        accpparr: accpp,
                        accpostarr: accpost,
                        image: data.profilepic,
                    });
                }
                else{
                    for(let i=0;i<arr.length;i++){
                        User.findOne({username: arr[i]}, function(e,d){
                            if(e){
                                console.log(e);
                            }
                            else
                            {
                                for(let j=d.posts.length-1;j>=0;j--){
                                    accuname.unshift(d.username);
                                    accpp.unshift(d.profilepic);
                                    accpost.unshift(d.posts[j]);
                                }

                                if(i===arr.length-1){
                                    res.render("home",{
                                        username: u,
                                        fullname: f,
                                        accunamearr: accuname,
                                        accpparr: accpp,
                                        accpostarr: accpost,
                                        image: data.profilepic,
                                    });
                                }
                            }
                        });
                    }
                }
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/profile",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;

    if(req.isAuthenticated()){
        User.findOne({username: u}, function(err,data){
            if(err){
                console.log(err);
            }
            else
            {
                res.render("profile",{
                    username: u,
                    fullname: f,
                    image: data.profilepic,
                    posts: data.posts,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following
                });
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/message",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    res.render("message",{
        username: u,
        fullname: f
    });
});

app.get("/create",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    res.render("create",{
        username: u,
        fullname: f
    });
});

app.post("/upload",upload.single('image'),function(req,res,next){
    if(req.isAuthenticated()){
        const u = req.body.uname;
        const f = req.body.fname;
        let filePath = './public/uploads/' + req.file.filename;
        let obj = { 
            img: { 
                data: fs.readFileSync(filePath), 
                contentType: 'image/png'
            },
            caption: req.body.postBody,
            likes: 0,
            comments: []
        }
        User.findOne({username: u}, function(err,data){
            if(err){
                console.log(err);
            }
            else
            {
                data.posts.unshift(obj);
                data.save();
                res.render("profile",{
                    username: u,
                    fullname: f,
                    image: data.profilepic,
                    posts: data.posts,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following
                });
            }
        });
    }
    else{
        res.redirect("/login");
    }
});

app.get("/explore",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    res.render("explore",{
        username: u,
        fullname: f
    });
});

app.post("/search",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.body.findAcc;

    if(acc === u){
        res.render("notfound");
    }
    else{
        User.findOne({username: acc}, function(err,data){
            if(err){
                console.log(err);
            }
            else
            {
                if(data){
                    res.render("findacc",{
                        username: u,
                        fullname: f,
                        accusername: data.username,
                        accfullname: data.fullname,
                        image: data.profilepic,
                        posts: data.posts,
                        bio: data.bio,
                        followers: data.followers,
                        following: data.following
                    });
                }
                else{
                    res.render("notfound");
                }
            }
        });
    }
});

app.get("/open",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.query.acc;

    if(u === acc){
        res.redirect("/profile?uname="+u+"&fname="+f);
    }
    else{
        User.findOne({username: acc}, function(err,data){
            if(err){
                console.log(err);
            }
            else
            {
                res.render("findacc",{
                    username: u,
                    fullname: f,
                    accusername: data.username,
                    accfullname: data.fullname,
                    image: data.profilepic,
                    posts: data.posts,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following
                });
            }
        });
    }
});

app.get("/editprof",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    User.findOne({username: u}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            res.render("editprof",{
                username: u,
                fullname: f,
                email: data.email,
                bio: data.bio
            });
        }
    });
});

app.post("/editprof",upload.single('image'),function(req,res,next){
    const u = req.body.usernameup;
    const fup = req.body.fullnameup;
    const bup = req.body.bioup;
    const eup = req.body.emailup;
    let obj = {};

    if(req.file){
        let filePath = './public/uploads/' + req.file.filename;
        obj = { 
            img: { 
                data: fs.readFileSync(filePath), 
                contentType: 'image/png'
            },
            caption: "",
            likes: 0,
            comments: []
        }
    }
    
    User.findOne({username: u}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            if(Object.keys(obj).length != 0){
                data.profilepic = obj;
            }
            data.bio = bup;
            data.email = eup;
            data.fullname = fup;
            data.save();
            res.render("profile",{
                username: u,
                fullname: fup,
                image: data.profilepic,
                posts: data.posts,
                bio: data.bio,
                followers: data.followers,
                following: data.following
            });
        }
    });
});

app.get("/follow",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.query.accuname;
    User.findOne({username: u}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            data.following.push(acc);
            data.save();

            User.findOne({username: acc}, function(e,d){
                if(err){
                    console.log(e);
                }
                else
                {
                    d.followers.push(u);
                    d.save();
        
                    res.render("findacc",{
                        username: u,
                        fullname: f,
                        accusername: d.username,
                        accfullname: d.fullname,
                        image: d.profilepic,
                        posts: d.posts,
                        bio: d.bio,
                        followers: d.followers,
                        following: d.following
                    });
                }
            });
        }
    });
});

app.get("/unfollow",function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.query.accuname;
    User.findOne({username: u}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            let index = data.following.indexOf(acc);
            data.following.splice(index, 1);
            data.save();

            User.findOne({username: acc}, function(e,d){
                if(err){
                    console.log(e);
                }
                else
                {
                    let index = d.followers.indexOf(u);
                    d.followers.splice(index, 1);
                    d.save();
        
                    res.render("findacc",{
                        username: u,
                        fullname: f,
                        accusername: d.username,
                        accfullname: d.fullname,
                        image: d.profilepic,
                        posts: d.posts,
                        bio: d.bio,
                        followers: d.followers,
                        following: d.following
                    });
                }
            });
        }
    });
});

app.post("/comment/:pageName",function(req,res){
    const u = req.body.uname;
    const f = req.body.fname;
    const acc = req.body.accuname;
    const pid = req.body.id;
    const comm = req.body.comm;
    const pN = req.params.pageName;
    User.findOne({username: acc}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            for(let i=0;i<data.posts.length;i++){
                let str = JSON.stringify(data.posts[i]._id);
                str = str.replace(/["]+/g, '');
                if(str == pid){
                    let obj = {
                        username: u,
                        com: comm
                    }
                    data.posts[i].comments.push(obj);
                    data.save();
                }
            }
            if(pN === "findacc"){
                res.render("findacc",{
                    username: u,
                    fullname: f,
                    accusername: acc,
                    accfullname: data.fullname,
                    image: data.profilepic,
                    posts: data.posts,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following
                });
            }
            else{
                res.render("profile",{
                    username: u,
                    fullname: f,
                    image: data.profilepic,
                    posts: data.posts,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following
                });
            }
        }
    });
});

app.get("/followers", function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.query.accuname;

    User.findOne({username: acc}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            res.render("followers",{
                username: u,
                fullname: f,
                followers: data.followers
            });
        }
    });
});

app.get("/following", function(req,res){
    const u = req.query.uname;
    const f = req.query.fname;
    const acc = req.query.accuname;

    User.findOne({username: acc}, function(err,data){
        if(err){
            console.log(err);
        }
        else
        {
            res.render("following",{
                username: u,
                fullname: f,
                following: data.following
            });
        }
    });
});

app.listen(process.env.PORT || 3000,function(){
    console.log("Server started on port 3000");
});