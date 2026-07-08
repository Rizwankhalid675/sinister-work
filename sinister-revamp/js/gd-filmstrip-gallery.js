if(console.log("GD Filmstrip Gallery Scripts v3.5.6c"),thumbVideosObj.thumbnailsObj=document.getElementById("thumbnails"),thumbVideosObj.prodVideosDataObj=document.getElementById("js-product-videos-data"),thumbVideosObj.prodVideosDataObj){const a=JSON.parse(thumbVideosObj.prodVideosDataObj.innerHTML);thumbVideosObj.masterProdVideoArr=a.data}else thumbVideosObj.masterProdVideoArr=[];function addVideoThumbnails(a){if(0===thumbVideosObj.masterProdVideoArr.length)return;let b="",c="",d="";thumbVideosObj.masterProdVideoArr.forEach(({youtube_embed_link:a,youtube_view_link:e,youtube_tn:f},g)=>{g<thumbVideosObj.maximum_videos_to_show&&(c=a.split("?"),d=`${c[0]}?rel=${thumbVideosObj.rel}`,thumbVideosObj.autoplay_video_when_tn_clicked&&(d+="&autoplay=1"),b+=`<li class="splide__slide x-filmstrip__list-item">
				<a
					href="javascript://Play"
					onclick="playGalleryVideo(this);
					showActiveThumbnail(false);"
					data-video_url="${e}"
					data-video_embed="${d}"
					class="x-filmstrip__link"
					aria-label="Play Video #${g} in Gallery"
					role="button"
				><picture class="x-filmstrip__picture x-filmstrip__picture-video">
					<img
						class="x-filmstrip__image"
						alt="Thumbnail of Product Video #${g}"
						decoding="async"
						loading="lazy"
						width="80" height="80"
						src="${f}"
						onerror="this.onerror=null; this.src='${"data:image/gif;base64,R0lGODlhZABkAIAAAAAAAP///yH5BAAAAAAALAAAAABkAGQAAAJzhI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8YhMKpfMpvMJjUqn1Kr1is1qt9yu9wsOi8fksvmMTqvX7Lb7DY/L5/S6/Y7P6/f8vv8PGCg4SFhoeIiYqLjI2Oj4CGlYAAA7"}';"
					>
				</picture></a>
			</li>`)}),"end"===a?thumbVideosObj.thumbnailsObj.insertAdjacentHTML("beforeend",b):thumbVideosObj.thumbnailsObj.insertAdjacentHTML("afterbegin",b)}function showActiveThumbnail(a){const b=document.querySelectorAll(".x-filmstrip__image");b.forEach(({classList:a})=>{a.remove("is-active")}),a&&a.classList.add("is-active")}function hideVideoShowGallery(){const a=document.querySelector("#filmstrip-video-iframe-container"),b=document.querySelector("[data-photograph]");a.innerHTML="",a.classList.add("u-hidden"),b.classList.remove("u-invisible")}function playGalleryVideo(a){const b=a.getAttribute("data-video_url"),c=a.getAttribute("data-video_embed"),d=document.querySelector("#filmstrip-video-iframe-container"),e=document.querySelector("[data-photograph]");e.classList.add("u-invisible"),d.classList.remove("u-hidden"),d.innerHTML=`
		<div class="filmstrip-video-close-area">
			<button class="c-button filmstrip-video-close-area-button" onclick="hideVideoShowGallery();"><span><span class="u-icon-cross u-font-small" aria-hidden="true"></span> Close Video</span></button>
		</div>
		<iframe
			src="${c}"
			width="100%"
			aria-label="Video for this item"
			class="filmstrip-video"
			allow="autoplay; encrypted-media"
			allowfullscreen=""
		>
			<a href="${b}" target="_blank" aria-label="Opens YouTube video in a new window">Click here to view this video</a>
		</iframe>
	`}document.addEventListener("ImageMachine_Thumbnails_Initialized",()=>{console.log("Thumbnails are done being regenerated")});