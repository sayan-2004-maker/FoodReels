const Like = require('../models/Like');
const Save = require('../models/Save');
const Follow = require('../models/Follow');
const person = user => user && ({ id: user._id || user.id, name: user.name, username: user.username, avatar: user.avatar, bio: user.bio, location: user.location });
async function reelCard(reel, viewerId) {
  const item = reel.toObject ? reel.toObject() : reel;
  let liked = false, saved = false, following = false;
  if (viewerId) { const [like, save, follow] = await Promise.all([Like.exists({ user: viewerId, reel: item._id }), Save.exists({ user: viewerId, reel: item._id }), item.author?._id && String(item.author._id) !== String(viewerId) ? Follow.exists({ follower: viewerId, following: item.author._id }) : false]); liked = Boolean(like); saved = Boolean(save); following = Boolean(follow); }
  return { id: item._id, title: item.title, caption: item.caption, videoUrl: item.video?.url, thumbnail: item.thumbnail?.url || '', location: item.location || {}, category: item.category && { id: item.category._id, name: item.category.name, slug: item.category.slug }, restaurant: item.restaurant && { id: item.restaurant._id, name: item.restaurant.name, location: item.restaurant.location }, hashtags: (item.hashtags || []).map(tag => ({ id: tag._id, name: tag.name })), recipe: item.recipe || null, audio: item.audio, author: person(item.author), counts: { views: item.viewCount || 0, likes: item.likeCount || 0, comments: item.commentCount || 0, saves: item.saveCount || 0, shares: item.shareCount || 0 }, viewer: { liked, saved, following }, createdAt: item.createdAt };
}
module.exports = { person, reelCard };
