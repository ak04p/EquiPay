const user = require("../models/user");
const review = require("../models/review");
const comment = require("../models/comment");
const company = require("../models/company");
const message = require("../models/message");
module.exports.postaddReview = async (req, res, next) => {
  let { companyname, salary, description, rating, designation } = req.body;
  let userid = req.user._id;
  try {
    let companydetails = await company.findOne({ name: companyname });
    let created = await review.create({
      userid: userid,
      company: companyname,
      salary: salary,
      description: description,
      rating: rating,
      designation: designation,
    });
    if (companydetails) {
      companydetails.reviews.push(created._id);
      companydetails.save();
      req.user.reviews.push(created._id);
      await req.user.save();
      res.json(created);
    } else {
      res.json(false);
    }
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postaddMessage = async (req, res, next) => {
  let { message } = req.body;
  let userid = req.user._id;
  try {
    let created = await message.create({
      userid: userid,
      message: message,
    });

    await created.save();
    res.json(created);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postaddComment = async (req, res, next) => {
  let { messageid, commentdetails } = req.body;
  let userid = req.user._id;
  try {
    let created = await comment.create({
      messageid: messageid,
      comment: commentdetails,
      userid: userid,
    });
    await created.save();
    res.json(created);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postdisplayMessages = async (req, res) => {
  try {
    let messages = await message.find({});
    res.json(messages);
  } catch {
    req.flash("info", `${err}`);
    next();
  }
};

module.exports.displayReview = async (req, res) => {
  try {
    let { reviewid } = req.body;
    let reviewdetails = await review
      .findOne({ _id: reviewid })
      .populate({ path: "company" });
    res.json(reviewdetails);
  } catch {
    req.flash("info", `${err}`);
    next();
  }
};

module.exports.postaddLike = async (req, res, next) => {
  let { messageid } = req.body;
  const userId = new ObjectId(req.user._id);
  try {
    let messageupdate = await message.findOne({ _id: messageid });
    if (messageupdate.dislikedBy.includes(userId)) {
      messageupdate.dislikedBy = messageupdate.dislikedBy.filter(
        (id) => id == userId
      );
      messageupdate.dislikes =
        messageupdate.dislikes > 1 ? messageupdate.dislikes - 1 : 0;
      await messageupdate.save();
    }
    if (!messageupdate.likedBy.includes(userId)) {
      messageupdate.likes += 1;
      messageupdate.likedBy.push(userId);

      await messageupdate.save();
    }

    res.json(messageupdate);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postaddDislike = async (req, res, next) => {
  let { messageid } = req.body;
  const userId = new ObjectId(req.user._id);
  try {
    let messageupdate = await post.findOne({ _id: messageid });
    if (messageupdate.likedBy.includes(userId)) {
      messageupdate.likedBy = messageupdate.likedBy.filter((id) => {
        return id == userId;
      });

      messageupdate.likes =
        messageupdate.likes > 1 ? messageupdate.likes - 1 : 0;
      await messageupdate.save();
    }
    if (!messageupdate.dislikedBy.includes(userId)) {
      messageupdate.dislikes += 1;
      messageupdate.dislikedBy.push(userId);
      await messageupdate.save();
    }

    res.json(messageupdate);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postaddComment = async (req, res, next) => {
  let { comment, messageid } = req.body;
  try {
    let added = await comment.create({
      messageid: messageid,
      comment: comment,
      userid: req.user._id,
    });
    let messageshow = await message.findOne({ _id: messageid });
    messageshow.comments.push(added._id);
    await messageshow.save();
    await messageshow.populate({
      path: "comments",
      populate: { path: "userid" },
      options: { sort: { date: "desc" } },
    });
    res.json(messageshow);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.updateReview = async (
  reviewToUpdate,
  { salary, rating, description }
) => {
  reviewToUpdate.salary = salary;
  reviewToUpdate.description = description;
  reviewToUpdate.rating = rating;
  return reviewToUpdate.save();
};
module.exports.postupdateReview = async (req, res, next) => {
  let { salary, rating, description, reviewid } = req.body;
  try {
    const reviewToUpdate = await review.findOne({ _id: reviewid });
    if (salary != null && rating != null && description != null) {
      await module.exports.updateReview(reviewToUpdate, {
        salary,
        rating,
        description,
      });
      res.json(reviewToUpdate);
    } else {
      res.json("msg:not entered correct details");
    }
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.postdeleteReview = async (req, res, next) => {
  let { reviewid } = req.body;
  try {
    await review.deleteOne({ _id: reviewid });
    req.user.reviews = req.user.reviews.filter((id) => id != reviewid);
    await req.user.save();
    let reviewshow = await review.find({ userid: req.user._id });
    res.json(reviewshow);
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
module.exports.getchartdetails = async (req, res, next) => {
  let { companyname } = req.query;
  try {
    let companydetails = await company.findOne({ name: companyname });
    let workers = await user.find({ companyid: companydetails._id });

    let mapped = await Promise.all(
      workers.map(async (worker) => {
        let review = await review.findOne({ userid: worker._id });
        return {
          gender: worker.gender,
          salary: review.salary,
          designation: review.designation,
        };
      })
    );
    
    //grouping the elemnets by there designation
    const groupDataBYJob = mapped.reduce((acc,employee)=>{
      if(!acc[employee.designation]){
        acc[employee.designation] = [];
      }
      acc[employee.designation].push(employee);
      return acc;
    },{});

    //grouping in each job by gender 
    const averageSalaryJobandGender = {};
    for(const[job,employees] of Object.entries(groupDataBYJob)){
      averageSalaryJobandGender[job] = employees.reduce((acc,emp)=>{
        if(!acc[emp.gender]){
          acc[emp.gender] = {totalSalary:0, count:0};
        }
        acc[emp.gender].totalSalary += emp.salary;
        acc[emp.gender].count += 1;
        return acc;
      },{});
    }

    //calculate the average salary
    for(const [job,data] of Object.entries(averageSalaryJobandGender)){
      for(const [gender, stats] of Object.entries(data)){
        averageSalaryJobandGender[job][gender].averageSalary = stats.totalSalary / stats.count;
      }
    }

    console.log(averageSalaryJobandGender);

    //calculate the pay gap
    const payGapByJob = {};
    for(const [job,data] of Object.entries(averageSalaryJobandGender)){
      payGapByJob[job] = {};
      const genders = Object.keys(data);
      for (let i = 0; i < genders.length; i++) {
        for (let j = i + 1; j < genders.length; j++) {
          const gender1 = genders[i];
          const gender2 = genders[j];
    
          payGapByJob[job][`${gender1}-${gender2}`] = 
            ((data[gender1].averageSalary - data[gender2].averageSalary) / data[gender1].averageSalary) * 100;
        }
      }
    }

    const responsePayload  ={
      employeeData: mapped,
      perJobGenderData: averageSalaryJobandGender,
      payGap: payGapByJob,

    }
    if (mapped.length > 0) {
      res.json(responsePayload);
    } else {
      res.json(false);
    }
  } catch (err) {
    req.flash("info", `${err}`);
    next();
  }
};
