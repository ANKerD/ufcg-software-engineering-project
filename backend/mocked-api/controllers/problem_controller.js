const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const config = require("../config");
const httpStatusCode = require("../constants/http-status-code.json");
const fetch = require('node-fetch');
const _ = require("lodash");
const apiAdress = config.apiAdress;

module.exports.register = async (req, res) => {
  try {
    const problem = new Problem(req.body.problem);
    console.log(problem);
    await problem.save();
    return res.status(httpStatusCode.CREATED).send(problem);
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatusCode.BAD_REQUEST)
      .send({ error: "error registering problem" });
  }
};

module.exports.findById = async (req, res) => {
  const _id = req.params._id;
  try {
    const problem = await Problem.findOne({ _id });
    console.log(problem);
    return res.status(httpStatusCode.OK).send({ problem });
  } catch (err) {
    return res
      .status(httpStatusCode.NOT_FOUND)
      .send({ error: "Problem Not Found" });
  }
};

/**
 * @param order String: ['asc', 'desc']
 * @param tags [String]: a json string with the tags to filter
 */
module.exports.find = async (req, res) => {
  const { level, pattern, order } = req.query;
  let { tags } = req.query;
  if (tags) tags = JSON.parse(tags);

  let problems;
  if (pattern) {
    problems = await Problem.find({ title: { $regex: `(?i).*${pattern}.*` } });
  } else {
    problems = await Problem.find();
  }

  if (level !== undefined) {
    problems = _.filter(problems, p => p.level === parseInt(level));
  }

  if (tags) {
    problems = _.filter(problems, p =>
      _.every(tags, tag => p.tags.includes(tag))
    );
  }

  if (order && ["asc", "desc"].includes(order)) {
    problems = _.orderBy(problems, ["level"], order);
  }

  return res.status(httpStatusCode.OK).send({
    results: problems
  });
};

module.exports.submit = async (req,res) => {
  const problemId = req.params._id;
  const player = req.player;
  const lang = req.body.lang;
  const code = req.files.code;
  const body = JSON.stringify({script:code});
  const init = {
    method : "POST",
    body : body,
    headers : {"Content-type": "text/plain","Language":lang}
  };

  console.log(fetch)
  try{
    const adress = apiAdress + `/problems/${problemId}`;
    const response = await fetch(adress, init);

    if (response.ok){
      console.log("ok");
      const data = await response.json();
      console.log(data);
      player.addSubmittedProblem(problemId, data.submission_id)
      res.status(httpStatusCode.OK).send(data);

    } else {
      console.log("not ok")
      res.status(httpStatusCode.BAD_REQUEST);
    }

  } catch (error) {
    console.log("error");
    console.log(error);
    res.status(httpStatusCode.BAD_REQUEST).send({error});
  }
};
