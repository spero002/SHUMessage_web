import {getUserInfoFromToken} from 'assets/js/tokenTools'
import {querystring} from 'vux'

export default {
  data: () => ({
    msg: {
      //防止ajax之前渲染replyPlaceholder时出错
      author: {
        name: ""
      }
    },
    raw: [],
    noMore: false,
    loadingMoreComments: false,
    page: 0
  }),
  methods: {
    reloadData() {
      this.$route.query.elComment = false;
      return this.loadData();
    },
    loadData() {
      this.loaded = false;
      const that = this;
      //老老实实axios
      const loadMessage = this.$axios({
        url: apiRoot + '/common/message',
        method: "get",
        params: this.$route.query
      }).then((res) => {
        this.msg = res.data.data
      });
      return Promise.all([loadMessage, this.loadComment()]).then(() => {
        that.handleAfterLoaded();
        that.loaded = true;
      })
    },
    loadComment() {
      let limit = [5, 10];
      //如果是回复列表
      if ('type' in this.$route.query && this.$route.query.type.toString() === '2') {//query的特殊性
        limit = [10];
      }
      return this.$axios({
        url: apiRoot + "/comment/list",
        method: "get",
        params: {
          ...this.$route.query,
          page: 0,
          limit: limit.toString()
        }
      }).then((res) => {
        if (res.data.code === "FAILED") {
          switch (res.data.message) {
            case "没有评论":
              console.log("糟了，没有评论");
              break
          }
          this.raw = [];
          return
        }
        this.raw = res.data.data.raw
      }).catch((err) => {
        console.error(err)
      })
    },
    loadMore(callback) {
      //仅loadMore第二个，即最新评论
      let limit = [0, 10];
      let updateBlockIndex = 1
      //如果是回复列表
      if ('type' in this.$route.query && this.$route.query.type.toString() === '2') {//query的特殊性
        limit = [10];
        updateBlockIndex = 0;
      }
      let that = this;
      if (!this.loadingMoreComments) {
        ++this.page;
        this.loadingMoreComments = true
        this.$axios({
          url: apiRoot + "/comment/list",
          method: "get",
          params: {
            ...that.$route.query,
            page: that.page,
            limit: limit.toString()
          }
        }).then((res) => {
          if (res.data.code === 'FAILED') {
            this.$toast({text: res.data.message, type: 'error'});
            return
          }
          if (res.data.data.raw[updateBlockIndex].cards.length === 0) {
            // console.log("nomore", res.data.data.raw)
            that.noMore = true
            return
          }
          if (res.data.data.raw.every((raw, index) => (raw.cards.length < limit[index] || !limit[index]))) {
            that.noMore = true
          }
          that.raw[updateBlockIndex].cards = that.raw[updateBlockIndex].cards.concat(res.data.data.raw[updateBlockIndex].cards)
          // console.log(that.raw)
        }).catch((err) => {
          console.error(err)
        }).finally(() => {
          callback();
          //500ms内不要重复ajax
          setTimeout(() => {
            that.loadingMoreComments = false
          }, 500)
        })
      }
    },
    handleComment(content, img, info) {
      let that = this;
      this.$axios({
        url: apiRoot + '/comment/newComment',
        method: 'post',
        data: {
          ...info,
          content,
          img: img === "" ? null : img
        }
      }).then((res) => {
        if (res.data.code === 'FAILED') {
          this.$toast({text: res.data.message, type: 'error'});
          return
        }
        this.replyName = this.msg.author.name;
        this.replyInfo = this.msg.info;
        // (async () => {
        //   that.noMore = false
        //   that.page = 0
        //   await that.loadComment()
        //   that.$vux.toast.text('评论成功')
        // })();
        that.noMore = false;
        that.page = 0;
        that.loadComment();
        that.$toast({text: '评论成功'});

        // //如果是在评论界面回复评论
        // if (info.type.toString() !== this.$route.query.type.toString()) {
        //   for (let block of this.raw) {
        //     let cardIndex = block.cards.findIndex((card) => {
        //       return card.info.type === info.type && card.info.id === info.id
        //     })
        //     let card = block.cards[cardIndex]
        //     if (card.replies.count < 2) {
        //       card.replies.count++
        //       if (!card.replies.representatives) {
        //         card.replies.representatives = []
        //       }
        //       let uinfo = getUserInfoFromToken()
        //       card.replies.representatives.push({
        //         author: {
        //           name: "",
        //           id: uinfo.id
        //         },
        //         content: content,
        //         imgs: img ? [img] : null
        //       })
        //     }
        //   }
        // }
      }).catch((err) => {
        console.error(err)
      })
    }
  }
}
