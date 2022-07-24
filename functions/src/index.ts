import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import {createTransport} from "nodemailer";

const app = admin.initializeApp();

const transporter = createTransport({
    service: "yandex",
    host: "smtp.yandex.com",
    port: 465,
    secure: true,
    auth: {
        user: "lockem@trebuchet.one",
        pass: "%4b52W*g295m&^P*"
    }
});


export const sendOtp = functions.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;

    if(!uid)
        throw new functions.https.HttpsError("unauthenticated", "User should be authenticated");

    const otp = [...Array(6)].map(_=>Math.random()*10|0).join("");
    const key = [...Array(25)].map(_=>Math.random()*10|0).join("");

    await app.firestore().doc(`/otps/${uid}`).set({otp, key, uid: context.auth?.uid});

    console.log(await transporter.sendMail({
        from: "lockem@trebuchet.one",
        to: context.auth?.token.email,
        subject: "2FA OTP",
        html: `<h1>Lock'em</h1> Your otp is <b>${otp}</b>`
    }));

});


export const verifyOtp = functions.https.onCall(async (data, context) =>{
    const uid = context.auth?.uid;

    if(!uid)
        throw new functions.https.HttpsError("unauthenticated", "User should be authenticated");

    if(!data.otp)
        throw new functions.https.HttpsError("invalid-argument", "otp is required");

    const doc = await app.firestore().doc(`/otps/${uid}`).get();

    if(doc.get("otp") == "INVALID")
        throw new functions.https.HttpsError("failed-precondition", "otp expired");

    if(!doc.get("key") || doc.get("otp") != data.otp)
        throw new functions.https.HttpsError("permission-denied", "otp invalid");

    await doc.ref.update({otp: "INVALID"})

    return {key: doc.get("key")};
});
