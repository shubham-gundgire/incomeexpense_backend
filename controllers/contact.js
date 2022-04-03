const Contact = require('../model/contact');

const contact = async (req, res) => {
   try {
       
       const { name, email, subject, msg } = req.body;
       const conres = await Contact.create({ name, email, subject, msg })
         .then((data) => {
           return data;
         })
         .catch((e) => {
           res.status(403).json({
             msg: "please try again",
             code: "100",
             e
           });
         });
       res.status(200).json({
           msg: "message sent succesfully",
           code:200
})
       
   } catch (error) {
        res.status(403).json({
          msg: "please try again",
          code: "100",
          error: error,
        });
   } 
}
module.exports = { contact };