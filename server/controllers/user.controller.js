const userModel = require("../models/user-model")

exports.test = async (req, res, next) => {
    
};

exports.createUser = async (req, res, next) => {
    let message = "";
    const originalPassword = req.body.password;
    const hashedPassword = await bcrypt.hash(originalPassword, 10)

    try {
        const user = {
            username: req.body.username,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            password: hashedPassword,
        };

        const checkUsername = await User.findByUsername(req.body.username);
        if (checkUsername) {
            message = "Username already exist. Please try again!";
            console.log(message);
            return res.status(400).json({ error: message });
        }

        const checkEmail = await User.findUserByEmail(req.body.email);
        if (checkEmail) {
            message = "Email already registered. Please try again!";
            console.log(message);
            return res.status(400).json({ error: message });
        }

        if (!checkUsername && !checkEmail) {
            try {
                const create = await User.createUser(user);
                const userId = create._id;
                message = "User Created";
                console.log("User Created");
                return res.status(200).json({ message: message });

            } catch (err) {
                console.error(err);
                message = err;
                return res.status(400).json({ error: message });
            }
        }

    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.login = async (req, res, next) => {
    let message = "";

    try {
        const enteredPassword = req.body.password;

        //find if username exist first
        const user = await User.findByUsername(req.body.username);

        //if username does not exist, show this
        if (!user) {
            message = "User not found. Please try again!";
            console.log(message);
            return res.status(400).json({ error: message });
        }

        //check if entered password match user's password in database
        const match = await bcrypt.compare(enteredPassword, user.password);

        //if dont match show this
        if (!match) {
            message = "Wrong password. Please try again!"
            console.log(message);
            return res.status(400).json({ error: message });
        }

        //if all pass, save session user details
        req.session.user = {
            id: user._id,
            username: user.username,
        }

        //finish login process, go to home
        console.log("Log In Successful");
        return res.status(200).json({ data: req.session.user });

    } catch (err) {
        next(err)
        // console.error(err);
        // message = err;
        // return res.status(400).json({ error: message });
    }
};

exports.updatePassword = async (req, res, next) => {
    let message = "";
    try {
        const newPassword = req.body.newPassword;
        const confirmPassword = req.body.confirmPassword;

        //if password does not match, throw error message to user
        if (newPassword !== confirmPassword) {
            message = "Password mismatched. Please try again!"
            console.log(message);
            return res.status(400).json({ error: message });
        }

        //password same, hash the confirmed password
        if (newPassword === confirmPassword) {
            const hashedPassword = await bcrypt.hash(confirmPassword, 10)

            //using user id stored in session, update acccount password
            const user_id = req.session.user.id
            const update = await User.updateUserPassword(user_id, hashedPassword);
            console.log("Password Updated", update);
            message = "updated"

            return res.status(200).json({ message: message });
        }

    } catch (err) {
        next(err)
        // console.error(err);
        // message = err
        // return res.status(400).json({ error: message });
    }
};
