const userModel = require("../models/user-model")
const axios = require('axios');


exports.test = async (req, res, next) => {

};

exports.createUser = async (req, res, next) => {
    let message = "";

    try {
        const user = {
            userID: req.body.userID,
            displayname: req.body.displayname,
            experience: null,
        };

        const create = await userModel.createUser(user);
        const userId = create._id;
        message = "User Created";
        console.log("User Created");
        return res.status(200).json({ message: message });


    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.githubOAuth = async (req, res, next) => {

    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    console.log("--------------------------")
    console.log("Start Authenticating...")
    try {
        const payload = {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: req.body.code
        }

        const header = {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'booyah'
            }
        };

        const token_res = await axios.post("https://github.com/login/oauth/access_token", payload, header)

        const accessToken = token_res.data.access_token

        if (!accessToken) {
            return res.status(400).json({ message: 'Failed to obtain access token' })
        }
        console.log("Authenticated")


        console.log("Getting user info...")
        // 2. Fetch user details from GitHub API using the access token
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        const githubUser = userResponse.data
        console.log("User identified:", githubUser.login, "(", githubUser.id, ")")

        console.log("Checking if user is registered with booyah...")
        let isNewUser = false

        const check = await userModel.findByUserId(githubUser.id);
        console.log(check);


        if (check.length == 0) {
            console.log("Not a user, creating...")
            isNewUser = true

            const user = {
                userID: githubUser.id,
                displayname: githubUser.name ? githubUser.name : githubUser.login,
                experience: null,
            };

            const create = await userModel.createUser(user);
            console.log("User Created");
        }
        console.log("--------------------------")


        res.json({
            token: accessToken,
            user: {
                id: githubUser.id,
                username: githubUser.login,
                name: githubUser.name,
                avatar: githubUser.avatar_url,
                experience: check[0] ? check[0].experience : null
            },
            newUser: isNewUser
        })

    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.checkUserIdExist = async (req, res, next) => {
    let message = "";

    try {

        const find = await userModel.findByUserId(req.body.userID);
        console.log(find)
        // console.log("User Created");
        return res.status(200).json({ message: find.length == 0 ? false : find[0] });
    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.updateUserExperience = async (req, res, next) => {
    let message = "";

    try {
        const userId = req.body.userID
        const newExperience = req.body.experience

        const updateExp = await userModel.updateUserExperience(userId, newExperience);
        message = { modified: updateExp.modifiedCount }
        console.log(updateExp.modifiedCount, "Experience Updated");
        return res.status(200).json(message);
    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.updateUserDisplayName = async (req, res, next) => {
    let message = "";

    try {
        const userId = req.body.userID
        const newDisplayName = req.body.displayname

        const updateDisp = await userModel.updateUserExperience(userId, newDisplayName);
        message = { modified: updateDisp.modifiedCount }
        console.log(updateDisp.modifiedCount, "Display Name Updated");
        return res.status(200).json(message);
    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};