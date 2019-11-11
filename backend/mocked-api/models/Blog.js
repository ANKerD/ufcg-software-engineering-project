const {Schema, model} = require("mongoose");
const validator = require("validator");
const Player = require("../models/Player");
const {Comment,CommentSchema} = require("../models/Comment");
const ObjectId = Schema.Types.ObjectId;

const BlogSchema = new Schema({
    title: {
        type: String,
        required: [true, "Title cannot be empty"],
        trim: true,
        minlength: 5,
        maxlength: 200
    },
    _authorId: {
        type: ObjectId,
        ref: "Player",
        required: [true, "A blog must have an author"]
    },
    body: {
        type: String,
        required: [true, "A blog must have a body"],
        trim: true,
        minlength: 5,
        maxlength: 5000
    },
    likes: {
        type: [ObjectId],
        ref: "Player"
    },
    dislikes: {
        type: [ObjectId],
        ref: "Player"
    },
    comments: { type: [CommentSchema] }
},{
    timestamps: true,
    collection: "Blogs"
});

BlogSchema.statics.findByAuthor = async function(nick) {
    const player = await Player.findOne({nick});

    if (!player) {
        throw new Error({error: "Invalid player nickname"})
    }

    const query = await Blog.find({_authorId:player._id});
    const result = await asyncMapShow(query);
    return result;
};

const asyncMapShow = async function(list) {
    return await Promise.all(list.map(async elem => {return elem.show()}))
}

const asyncMapToProfile = async function(list) {
    playerList = await Promise.all(list.map(async id => {return Player.findOne({_id:id})}))

    return playerList.map(player => {return player.toProfile().profile.nick})
}

BlogSchema.statics.sortByCreationTime = async function() {
    const query = await Blog.find({}).sort("createdAt");
    const blogs = await asyncMapShow(query);
    return blogs;
};

BlogSchema.statics.sortByLikes = async function() {
    const query = await Blog.find({});
    const sortedQuery = query.sort((a,b) => b.likes.length - a.likes.length);
    const blogs = await asyncMapShow(sortedQuery);
    return blogs;
}

BlogSchema.statics.searchBody = async function(pattern) {
    const query = await Blog.find({"body": {$regex: `.*${pattern}.*`}});
    const result = await asyncMapShow(query);
    return result;
};

BlogSchema.statics.searchTitle = async function(pattern) {
    const query = await Blog.find({"title": {$regex: `.*${pattern}.*`}});
    const result = await asyncMapShow(query);
    return result;
};

BlogSchema.methods.like = async function(playerID) {
    const blog = this;

    if (blog.likes.includes(playerID)){
        blog.likes = blog.likes.filter((elem)=>!elem.equals(playerID));
    } else {
        blog.likes = blog.likes.concat(playerID);
        blog.dislikes = blog.dislikes.filter((elem)=>!elem.equals(playerID));
    }

    await blog.save();
};

BlogSchema.methods.dislike = async function(playerID) {
    const blog = this;

    if (blog.dislikes.includes(playerID)){
        blog.dislikes = blog.dislikes.filter((elem)=>!elem.equals(playerID));
    } else {
        blog.dislikes = blog.dislikes.concat(playerID);
        blog.likes = blog.likes.filter((elem)=>!elem.equals(playerID));
    }

    await blog.save();
};

BlogSchema.methods.show = async function() {
    const player = await Player.findOne({_id:this._authorId});
    const profile = player.toProfile();
    return {
        blog: {
            id: this._id,
            author: profile,
            title: this.title,
            content: this.body,
            comments: await asyncMapShow(this.comments),
            numlikes: this.likes.length,
            numdislikes: this.dislikes.length,
            likes: await asyncMapToProfile(this.likes),
            dislikes: await asyncMapToProfile(this.dislikes)
        }
    };
};

BlogSchema.methods.addComment = async function(_authorId,body) {
    const newComment = new Comment({_authorId,body});
    this.comments = this.comments.concat(newComment);
    await this.save();
};

BlogSchema.methods.removeComment = async function(commentId, authorId){

    this.target = this.comments.filter(comment => comment._id.equals(commentId));

    if (target._authorId.equals(authorId)){
        this.comments = this.comments.filter(comment => !comment._id.equals(commentId));
        await this.save();
    } else {
        throw new Error({error: "You're not authorized to delete this comment"})
    }
}

const Blog = model('Blog', BlogSchema);
module.exports = Blog;