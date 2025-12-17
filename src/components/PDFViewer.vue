<template>
  <div class="dom-based-pdf-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- PC端工具栏 -->
      <div class="toolbar-desktop">
        <div class="toolbar-group">
          <button @click="handleZoomOut" :disabled="!isLoaded" title="缩小">
            <svg viewBox="0 0 1024 1024">
              <path d="M637.866667 449.706667c0-103.765333-84.224-187.733333-188.074667-187.733334-103.850667 0-188.074667 84.053333-188.074667 187.733334 0 103.68 84.224 187.733333 188.074667 187.733333 103.850667 0 188.074667-84.053333 188.074667-187.733333z m-55.466667 0c0 72.96-59.306667 132.181333-132.608 132.181333s-132.608-59.221333-132.608-132.181333c0-72.96 59.306667-132.181333 132.608-132.181334s132.608 59.221333 132.608 132.181334zM853.333333 170.666667H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v512c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V256c0-46.933333-38.4-85.333333-85.333334-85.333333z m0 597.333333H170.666667V256h682.666666v512z" fill="currentColor"/>
              <path d="M362.666667 426.666667h170.666666v42.666666H362.666667z" fill="currentColor"/>
            </svg>
          </button>
          <span class="scale-display">{{ scalePercent }}%</span>
          <button @click="handleZoomIn" :disabled="!isLoaded" title="放大">
            <svg viewBox="0 0 1024 1024">
              <path d="M637.866667 449.706667c0-103.765333-84.224-187.733333-188.074667-187.733334-103.850667 0-188.074667 84.053333-188.074667 187.733334 0 103.68 84.224 187.733333 188.074667 187.733333 103.850667 0 188.074667-84.053333 188.074667-187.733333z m-55.466667 0c0 72.96-59.306667 132.181333-132.608 132.181333s-132.608-59.221333-132.608-132.181333c0-72.96 59.306667-132.181333 132.608-132.181334s132.608 59.221333 132.608 132.181334zM853.333333 170.666667H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v512c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V256c0-46.933333-38.4-85.333333-85.333334-85.333333z m0 597.333333H170.666667V256h682.666666v512z" fill="currentColor"/>
              <path d="M362.666667 426.666667h85.333333V341.333333h42.666667v85.333334h85.333333v42.666666h-85.333333v85.333334h-42.666667v-85.333334H362.666667z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="handleResetZoom" :disabled="!isLoaded" title="重置">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 938.666667c-200.298667 0-373.077333-138.24-420.266667-333.738667l82.688-17.237333C214.613333 742.4 353.706667 853.333333 512 853.333333c235.648 0 426.666667-191.018667 426.666667-426.666666S747.648 0 512 0c-117.674667 0-228.522667 48.298667-308.736 133.034667L298.666667 213.333333l-1.066667 213.333334L85.333333 384l-1.066666-213.333333 92.501333-96.426667C273.706667 -19.626667 389.546667-85.333333 512-85.333333c282.752 0 512 229.248 512 512S794.752 938.666667 512 938.666667z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div class="toolbar-group">
          <span v-if="isLoaded" class="page-info">{{ totalPages }} 页</span>
          <span v-else>加载中...</span>
        </div>

        <div class="toolbar-group tool-buttons-group">
          <div
            v-for="tool in tools"
            :key="tool.name"
            class="tool-button-wrapper"
          >
            <button
              @click="handleActivateTool(tool.name)"
              :class="{ active: activeTool === tool.name }"
              :disabled="!isLoaded"
              :title="tool.label"
              class="icon-button"
            >
              <span v-html="tool.icon"></span>
            </button>

          <!-- Popover 属性面板 -->
          <div
            v-if="activeTool === tool.name && showToolPopover"
            class="tool-popover"
            @mousedown.stop
            @click.stop
          >
            <div class="popover-arrow"></div>
            <div class="popover-content">
              <!-- 颜色选择 -->
              <div class="popover-item">
                <label>颜色:</label>
                <input
                  type="color"
                  :value="selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.color || '#ff0000') : toolDefaults[tool.name].color"
                  @input="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('color', ($event.target as HTMLInputElement).value) : updateToolDefault(tool.name, 'color', ($event.target as HTMLInputElement).value)"
                />
              </div>

              <!-- 填充颜色（仅矩形和圆形） -->
              <div
                v-if="tool.name === 'rectangle' || tool.name === 'circle'"
                class="popover-item"
              >
                <label>填充:</label>
                <input
                  type="color"
                  :value="selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.fillColor && selectedAnnotation.fillColor !== 'transparent' ? selectedAnnotation.fillColor : '#ffffff') : (toolDefaults[tool.name].fillColor !== 'transparent' ? toolDefaults[tool.name].fillColor : '#ffffff')"
                  @input="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('fillColor', ($event.target as HTMLInputElement).value) : updateToolDefault(tool.name, 'fillColor', ($event.target as HTMLInputElement).value)"
                />
                <button
                  @click="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('fillColor', 'transparent') : updateToolDefault(tool.name, 'fillColor', 'transparent')"
                  class="mini-btn"
                >
                  透明
                </button>
              </div>

              <!-- 线条粗细 -->
              <div
                v-if="tool.name !== 'text'"
                class="popover-item"
              >
                <label>粗细:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  :value="selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.lineWidth || 2) : toolDefaults[tool.name].lineWidth"
                  @input="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('lineWidth', Number(($event.target as HTMLInputElement).value)) : updateToolDefault(tool.name, 'lineWidth', Number(($event.target as HTMLInputElement).value))"
                />
                <span class="value-display">{{ selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.lineWidth || 2) : toolDefaults[tool.name].lineWidth }}px</span>
              </div>

              <!-- 字体大小（仅文字） -->
              <div
                v-if="tool.name === 'text'"
                class="popover-item"
              >
                <label>字号:</label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  :value="selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.fontSize || 16) : toolDefaults[tool.name].fontSize"
                  @input="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('fontSize', Number(($event.target as HTMLInputElement).value)) : updateToolDefault(tool.name, 'fontSize', Number(($event.target as HTMLInputElement).value))"
                />
                <span class="value-display">{{ selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.fontSize || 16) : toolDefaults[tool.name].fontSize }}px</span>
              </div>

              <!-- 边框粗细（文字） -->
              <div
                v-if="tool.name === 'text'"
                class="popover-item"
              >
                <label>边框:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  :value="selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.lineWidth || 2) : toolDefaults[tool.name].lineWidth"
                  @input="selectedAnnotation && selectedAnnotation.type === tool.name ? updateAnnotationProperty('lineWidth', Number(($event.target as HTMLInputElement).value)) : updateToolDefault(tool.name, 'lineWidth', Number(($event.target as HTMLInputElement).value))"
                />
                <span class="value-display">{{ selectedAnnotation && selectedAnnotation.type === tool.name ? (selectedAnnotation.lineWidth || 2) : toolDefaults[tool.name].lineWidth }}px</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div class="toolbar-group">
          <button @click="handleDeleteSelected" :disabled="!selectedAnnotation" title="删除">
            <svg viewBox="0 0 1024 1024">
              <path d="M360.448 800.768h48.128V432.128h-48.128v368.64z m151.552 0h48.128V432.128h-48.128v368.64z m295.936-448.512v48.128H759.808v496.64c0 31.744-26.112 57.856-57.856 57.856H322.56c-31.744 0-57.856-26.112-57.856-57.856V400.384H216.576v-48.128h192.512V247.808c0-31.744 26.112-57.856 57.856-57.856h90.112c31.744 0 57.856 26.112 57.856 57.856v104.448h193.024z m-240.64-104.448c0-5.632-4.608-10.24-10.24-10.24h-90.112c-5.632 0-10.24 4.608-10.24 10.24v104.448h110.592V247.808z m193.024 152.576H264.704v496.64c0 5.632 4.608 10.24 10.24 10.24h379.392c5.632 0 10.24-4.608 10.24-10.24V400.384h95.744z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="handleUndo" :disabled="!canUndo" title="撤销">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 981.333333C252.8 981.333333 42.666667 771.2 42.666667 512S252.8 42.666667 512 42.666667c117.333333 0 228.266667 42.666667 315.733333 117.333333l-59.733333 59.733333C693.333333 151.466667 605.866667 128 512 128 298.666667 128 128 298.666667 128 512s170.666667 384 384 384 384-170.666667 384-384h85.333333c0 259.2-210.133333 469.333333-469.333333 469.333333z" fill="currentColor"/>
              <path d="M746.666667 341.333333h170.666666v170.666667h-85.333333V426.666667h-85.333333z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="handleRedo" :disabled="!canRedo" title="重做">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 981.333333c259.2 0 469.333333-210.133333 469.333333-469.333333S771.2 42.666667 512 42.666667c-117.333333 0-228.266667 42.666667-315.733333 117.333333l59.733333 59.733333C330.666667 151.466667 418.133333 128 512 128c213.333333 0 384 170.666667 384 384s-170.666667 384-384 384-384-170.666667-384-384H42.666667c0 259.2 210.133333 469.333333 469.333333 469.333333z" fill="currentColor"/>
              <path d="M277.333333 341.333333H106.666667v170.666667h85.333333V426.666667h85.333333z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="handleClearAll" :disabled="!isLoaded" title="清空">
            <svg viewBox="0 0 1024 1024">
              <path d="M899.413333 328.533333l-61.44-61.44L512 593.066667 186.026667 267.093333l-61.44 61.44L450.56 654.506667 124.586667 980.48l61.44 61.44L512 715.946667l325.973333 325.973333 61.44-61.44-325.973333-325.973333z" fill="currentColor"/>
            </svg>
          </button>
          <button @click="handleExport" :disabled="!isLoaded" title="导出">
            <svg viewBox="0 0 1024 1024">
              <path d="M554.666667 725.333333h85.333333v-213.333333l106.666667 106.666667 59.733333-59.733334L512 264.533333 217.6 558.933333l59.733333 59.733334 106.666667-106.666667v213.333333h85.333333v-213.333333h85.333334v213.333333zM810.666667 810.666667H213.333333v85.333333h597.333334v-85.333333z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 移动端工具栏 -->
      <div class="toolbar-mobile">
        <!-- 第一行:核心功能 -->
        <div class="toolbar-row-main">
          <div class="toolbar-group">
            <button @click="handleZoomOut" :disabled="!isLoaded" title="缩小" class="icon-button-mobile">
              <svg viewBox="0 0 1024 1024">
                <path d="M637.866667 449.706667c0-103.765333-84.224-187.733333-188.074667-187.733334-103.850667 0-188.074667 84.053333-188.074667 187.733334 0 103.68 84.224 187.733333 188.074667 187.733333 103.850667 0 188.074667-84.053333 188.074667-187.733333z m-55.466667 0c0 72.96-59.306667 132.181333-132.608 132.181333s-132.608-59.221333-132.608-132.181333c0-72.96 59.306667-132.181333 132.608-132.181334s132.608 59.221333 132.608 132.181334zM853.333333 170.666667H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v512c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V256c0-46.933333-38.4-85.333333-85.333334-85.333333z m0 597.333333H170.666667V256h682.666666v512z" fill="currentColor"/>
                <path d="M362.666667 426.666667h170.666666v42.666666H362.666667z" fill="currentColor"/>
              </svg>
            </button>
            <span class="scale-display">{{ scalePercent }}%</span>
            <button @click="handleZoomIn" :disabled="!isLoaded" title="放大" class="icon-button-mobile">
              <svg viewBox="0 0 1024 1024">
                <path d="M637.866667 449.706667c0-103.765333-84.224-187.733333-188.074667-187.733334-103.850667 0-188.074667 84.053333-188.074667 187.733334 0 103.68 84.224 187.733333 188.074667 187.733333 103.850667 0 188.074667-84.053333 188.074667-187.733333z m-55.466667 0c0 72.96-59.306667 132.181333-132.608 132.181333s-132.608-59.221333-132.608-132.181333c0-72.96 59.306667-132.181333 132.608-132.181334s132.608 59.221333 132.608 132.181334zM853.333333 170.666667H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v512c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V256c0-46.933333-38.4-85.333333-85.333334-85.333333z m0 597.333333H170.666667V256h682.666666v512z" fill="currentColor"/>
                <path d="M362.666667 426.666667h85.333333V341.333333h42.666667v85.333334h85.333333v42.666666h-85.333333v85.333334h-42.666667v-85.333334H362.666667z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <div class="toolbar-group">
            <button
              v-for="tool in tools"
              :key="tool.name"
              @click="handleActivateTool(tool.name)"
              :class="{ active: activeTool === tool.name }"
              :disabled="!isLoaded"
              :title="tool.label"
              class="icon-button-mobile"
            >
              <span v-html="tool.icon"></span>
            </button>
          </div>

          <button @click="toggleMobileMenu" class="menu-toggle icon-button-mobile" title="更多">
            <svg viewBox="0 0 1024 1024" :class="{ rotated: showMobileMenu }">
              <path d="M512 714.666667l-277.333333-277.333334 60.586666-60.586666L512 593.493333l216.746667-216.746666 60.586666 60.586666z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 移动端扩展菜单 -->
    <transition name="slide-down">
      <div v-if="showMobileMenu" class="mobile-menu">
        <div class="mobile-menu-content">
          <button @click="handleResetZoom(); showMobileMenu = false" :disabled="!isLoaded">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 938.666667c-200.298667 0-373.077333-138.24-420.266667-333.738667l82.688-17.237333C214.613333 742.4 353.706667 853.333333 512 853.333333c235.648 0 426.666667-191.018667 426.666667-426.666666S747.648 0 512 0c-117.674667 0-228.522667 48.298667-308.736 133.034667L298.666667 213.333333l-1.066667 213.333334L85.333333 384l-1.066666-213.333333 92.501333-96.426667C273.706667 -19.626667 389.546667-85.333333 512-85.333333c282.752 0 512 229.248 512 512S794.752 938.666667 512 938.666667z" fill="currentColor"/>
            </svg>
            <span>重置缩放</span>
          </button>
          <button @click="handleDeleteSelected(); showMobileMenu = false" :disabled="!selectedAnnotation">
            <svg viewBox="0 0 1024 1024">
              <path d="M360.448 800.768h48.128V432.128h-48.128v368.64z m151.552 0h48.128V432.128h-48.128v368.64z m295.936-448.512v48.128H759.808v496.64c0 31.744-26.112 57.856-57.856 57.856H322.56c-31.744 0-57.856-26.112-57.856-57.856V400.384H216.576v-48.128h192.512V247.808c0-31.744 26.112-57.856 57.856-57.856h90.112c31.744 0 57.856 26.112 57.856 57.856v104.448h193.024z m-240.64-104.448c0-5.632-4.608-10.24-10.24-10.24h-90.112c-5.632 0-10.24 4.608-10.24 10.24v104.448h110.592V247.808z m193.024 152.576H264.704v496.64c0 5.632 4.608 10.24 10.24 10.24h379.392c5.632 0 10.24-4.608 10.24-10.24V400.384h95.744z" fill="currentColor"/>
            </svg>
            <span>删除</span>
          </button>
          <button @click="handleUndo(); showMobileMenu = false" :disabled="!canUndo">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 981.333333C252.8 981.333333 42.666667 771.2 42.666667 512S252.8 42.666667 512 42.666667c117.333333 0 228.266667 42.666667 315.733333 117.333333l-59.733333 59.733333C693.333333 151.466667 605.866667 128 512 128 298.666667 128 128 298.666667 128 512s170.666667 384 384 384 384-170.666667 384-384h85.333333c0 259.2-210.133333 469.333333-469.333333 469.333333z" fill="currentColor"/>
              <path d="M746.666667 341.333333h170.666666v170.666667h-85.333333V426.666667h-85.333333z" fill="currentColor"/>
            </svg>
            <span>撤销</span>
          </button>
          <button @click="handleRedo(); showMobileMenu = false" :disabled="!canRedo">
            <svg viewBox="0 0 1024 1024">
              <path d="M512 981.333333c259.2 0 469.333333-210.133333 469.333333-469.333333S771.2 42.666667 512 42.666667c-117.333333 0-228.266667 42.666667-315.733333 117.333333l59.733333 59.733333C330.666667 151.466667 418.133333 128 512 128c213.333333 0 384 170.666667 384 384s-170.666667 384-384 384-384-170.666667-384-384H42.666667c0 259.2 210.133333 469.333333 469.333333 469.333333z" fill="currentColor"/>
              <path d="M277.333333 341.333333H106.666667v170.666667h85.333333V426.666667h85.333333z" fill="currentColor"/>
            </svg>
            <span>重做</span>
          </button>
          <button @click="handleClearAll(); showMobileMenu = false" :disabled="!isLoaded">
            <svg viewBox="0 0 1024 1024">
              <path d="M899.413333 328.533333l-61.44-61.44L512 593.066667 186.026667 267.093333l-61.44 61.44L450.56 654.506667 124.586667 980.48l61.44 61.44L512 715.946667l325.973333 325.973333 61.44-61.44-325.973333-325.973333z" fill="currentColor"/>
            </svg>
            <span>清空全部</span>
          </button>
          <button @click="handleExport(); showMobileMenu = false" :disabled="!isLoaded">
            <svg viewBox="0 0 1024 1024">
              <path d="M554.666667 725.333333h85.333333v-213.333333l106.666667 106.666667 59.733333-59.733334L512 264.533333 217.6 558.933333l59.733333 59.733334 106.666667-106.666667v213.333333h85.333333v-213.333333h85.333334v213.333333zM810.666667 810.666667H213.333333v85.333333h597.333334v-85.333333z" fill="currentColor"/>
            </svg>
            <span>导出JSON</span>
          </button>
          <div v-if="isLoaded" class="mobile-menu-info">
            <svg viewBox="0 0 1024 1024">
              <path d="M854.6 288.6L639.4 73.4c-6-6-14.1-9.4-22.6-9.4H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V311.3c0-8.5-3.4-16.7-9.4-22.7zM790.2 326H602V137.8L790.2 326z m1.8 562H232V136h302v216c0 23.2 18.8 42 42 42h216v494z" fill="currentColor"/>
            </svg>
            <span>总共 {{ totalPages }} 页</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- PDF容器 -->
    <div ref="containerRef" class="pdf-container">
      <div
        class="pages-wrapper"
        v-if="isLoaded"
        ref="pagesWrapperRef"
        :style="pagesWrapperStyle"
      >
        <!-- PDF 页面 -->
        <div
          v-for="pageNum in totalPages"
          :key="pageNum"
          class="page-wrapper"
          :data-page="pageNum"
          :ref="el => setPageRef(el, pageNum)"
        >
          <canvas :ref="el => setPdfCanvasRef(el, pageNum)"></canvas>
          <!-- 绘制层 - 用于捕获鼠标和触摸事件 -->
          <div
            class="drawing-layer"
            @mousedown="handleMouseDown($event, pageNum)"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @touchstart="handleTouchStart($event, pageNum)"
          ></div>
        </div>

        <!-- DOM 批注层 - 独立于页面 -->
        <div class="annotations-container">
          <!-- 矩形批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'rectangle')"
            :key="annotation.id"
            class="annotation annotation-rectangle"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
            @touchstart.stop="handleAnnotationTouchStart($event, annotation)"
          >
            <div
              class="annotation-border"
              :style="{
                borderColor: annotation.color || '#ff0000',
                borderWidth: `${annotation.lineWidth || 2}px`,
                backgroundColor: annotation.fillColor || 'transparent'
              }"
            ></div>
            <!-- 调整大小控制点 -->
            <template v-if="selectedAnnotation?.id === annotation.id">
              <div class="resize-handle nw" @mousedown.stop="handleResizeStart($event, annotation, 'nw')"></div>
              <div class="resize-handle ne" @mousedown.stop="handleResizeStart($event, annotation, 'ne')"></div>
              <div class="resize-handle sw" @mousedown.stop="handleResizeStart($event, annotation, 'sw')"></div>
              <div class="resize-handle se" @mousedown.stop="handleResizeStart($event, annotation, 'se')"></div>
              <div class="resize-handle n" @mousedown.stop="handleResizeStart($event, annotation, 'n')"></div>
              <div class="resize-handle e" @mousedown.stop="handleResizeStart($event, annotation, 'e')"></div>
              <div class="resize-handle s" @mousedown.stop="handleResizeStart($event, annotation, 's')"></div>
              <div class="resize-handle w" @mousedown.stop="handleResizeStart($event, annotation, 'w')"></div>
            </template>
          </div>

          <!-- 圆形批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'circle')"
            :key="annotation.id"
            class="annotation annotation-circle"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
            @touchstart.stop="handleAnnotationTouchStart($event, annotation)"
          >
            <div
              class="annotation-border"
              :style="{
                borderColor: annotation.color || '#ff0000',
                borderWidth: `${annotation.lineWidth || 2}px`,
                backgroundColor: annotation.fillColor || 'transparent'
              }"
            ></div>
            <!-- 调整大小控制点（圆形只用四个角） -->
            <template v-if="selectedAnnotation?.id === annotation.id">
              <div class="resize-handle nw" @mousedown.stop="handleResizeStart($event, annotation, 'nw')"></div>
              <div class="resize-handle ne" @mousedown.stop="handleResizeStart($event, annotation, 'ne')"></div>
              <div class="resize-handle sw" @mousedown.stop="handleResizeStart($event, annotation, 'sw')"></div>
              <div class="resize-handle se" @mousedown.stop="handleResizeStart($event, annotation, 'se')"></div>
            </template>
          </div>

          <!-- 线条批注 -->
          <svg
            v-for="annotation in annotations.filter(a => a.type === 'line')"
            :key="annotation.id"
            class="annotation annotation-line"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="getAnnotationStyle(annotation)"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
            @touchstart.stop="handleAnnotationTouchStart($event, annotation)"
          >
            <line
              :x1="0"
              :y1="0"
              :x2="getLineEndX(annotation)"
              :y2="getLineEndY(annotation)"
              :stroke="annotation.color || '#ff0000'"
              :stroke-width="annotation.lineWidth || 2"
            />
          </svg>

          <!-- 文字批注 -->
          <div
            v-for="annotation in annotations.filter(a => a.type === 'text')"
            :key="annotation.id"
            class="annotation annotation-text"
            :class="{ selected: selectedAnnotation?.id === annotation.id }"
            :style="{
              ...getAnnotationStyle(annotation),
              borderColor: annotation.color || '#ff0000',
              borderWidth: `${annotation.lineWidth || 2}px`
            }"
            @mousedown.stop="handleAnnotationMouseDown($event, annotation)"
            @touchstart.stop="handleAnnotationTouchStart($event, annotation)"
          >
            <span
              :style="{
                color: annotation.color || '#ff0000',
                fontSize: `${annotation.fontSize || 16}px`
              }"
            >
              {{ annotation.text }}
            </span>
          </div>

          <!-- 临时绘制预览 -->
          <div
            v-if="isDrawing && tempAnnotation"
            class="annotation temp-annotation"
            :class="`annotation-${tempAnnotation.type}`"
            :style="getTempAnnotationStyle()"
          >
            <div v-if="tempAnnotation.type === 'rectangle' || tempAnnotation.type === 'circle'" class="annotation-border dashed"></div>
            <svg v-if="tempAnnotation.type === 'line'" style="width: 100%; height: 100%;">
              <line
                :x1="0"
                :y1="0"
                :x2="tempAnnotation.width"
                :y2="tempAnnotation.height"
                stroke="red"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 文字输入框 -->
    <div
      v-if="showTextInput"
      class="text-input-wrapper"
      :style="textInputStyle"
      @mousedown.stop
      @click.stop
    >
      <input
        ref="textInputRef"
        v-model="textInputValue"
        class="text-input"
        @blur="handleTextInputBlur"
        @keydown.enter.prevent="handleTextInputConfirm"
        @keydown.esc="handleTextInputCancel"
        placeholder="输入文字（回车确认）"
        autocomplete="off"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const props = defineProps<{
  url: string;
}>();

// 状态
const containerRef = ref<HTMLElement>();
const pagesWrapperRef = ref<HTMLElement>();
const isLoaded = ref(false);
const totalPages = ref(0);
const scale = ref(1.5);
const initialScale = ref(1.5); // 保存初始scale,用于移动端自适应
const renderScale = ref(3.0); // PDF渲染时使用的高分辨率scale,避免放大后模糊
const activeTool = ref<string | null>(null); // 当前激活的工具,null表示未选中任何工具

// Canvas 和页面 refs
const pdfCanvasRefs = new Map<number, HTMLCanvasElement>();
const pageRefs = new Map<number, HTMLElement>();

const setPdfCanvasRef = (el: any, pageNum: number) => {
  if (el) pdfCanvasRefs.set(pageNum, el);
};

const setPageRef = (el: any, pageNum: number) => {
  if (el) pageRefs.set(pageNum, el);
};

// 批注数据
interface Annotation {
  id: string;
  type: string;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  // 样式属性
  color?: string;
  lineWidth?: number;
  fontSize?: number;
  fillColor?: string;
}

const annotations = ref<Annotation[]>([]);
const history = ref<Annotation[][]>([]);
const historyIndex = ref(-1);
const selectedAnnotation = ref<Annotation | null>(null);

// 绘制状态
const isDrawing = ref(false);
const isDragging = ref(false);
const startPos = ref({ x: 0, y: 0 });
const tempAnnotation = ref<any>(null);

// 拖拽优化：记录拖拽时的临时偏移和目标页
const dragOffset = ref({ x: 0, y: 0 });
const dragTargetPage = ref<number | null>(null);

// 调整大小状态
const isResizing = ref(false);
const resizeHandle = ref<string | null>(null);
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeOriginalAnnotation = ref<Annotation | null>(null);

// 绘制优化：使用 RAF 节流
let drawingRafId: number | null = null;

// 触摸事件标志
const isTouching = ref(false);

// 文字输入
const showTextInput = ref(false);
const textInputRef = ref<HTMLInputElement>();
const textInputValue = ref('');
const textInputPos = ref({ x: 0, y: 0, pageNum: 0 });

// 移动端菜单控制
const showMobileMenu = ref(false);

// 工具popover和默认值
const showToolPopover = ref(false); // 默认不显示popover
const toolDefaults = ref({
  rectangle: {
    color: '#ff0000',
    fillColor: 'transparent',
    lineWidth: 2
  },
  circle: {
    color: '#ff0000',
    fillColor: 'transparent',
    lineWidth: 2
  },
  line: {
    color: '#ff0000',
    lineWidth: 2
  },
  text: {
    color: '#ff0000',
    fontSize: 16,
    lineWidth: 2
  }
});

const scalePercent = computed(() => Math.round(scale.value * 100));
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

// 缩放样式：使用 CSS transform 实现无感缩放
const pagesWrapperStyle = computed(() => ({
  transform: `scale(${scale.value / initialScale.value})`, // 基于初始 scale
  transformOrigin: 'top left', // 改为左上角为基准,避免放大后左侧内容显示不全
  transition: 'transform 0.2s ease-out'
}));

const tools = [
  {
    name: 'rectangle',
    label: '矩形',
    icon: '<svg viewBox="0 0 1024 1024"><path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32z m-40 632H136V232h752v560z" fill="currentColor"/></svg>'
  },
  {
    name: 'circle',
    label: '圆形',
    icon: '<svg viewBox="0 0 1024 1024"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="currentColor"/></svg>'
  },
  {
    name: 'line',
    label: '线条',
    icon: '<svg viewBox="0 0 1024 1024"><path d="M904.533333 119.466667c-17.066667-17.066667-42.666667-17.066667-59.733333 0L119.466667 844.8c-17.066667 17.066667-17.066667 42.666667 0 59.733333 8.533333 8.533333 19.2 12.8 29.866666 12.8s21.333333-4.266667 29.866667-12.8L904.533333 179.2c17.066667-17.066667 17.066667-42.666667 0-59.733333z" fill="currentColor"/></svg>'
  },
  {
    name: 'text',
    label: '文字',
    icon: '<svg viewBox="0 0 1024 1024"><path d="M256 170.666667h512v85.333333h-170.666667v597.333333h-170.666666V256H256z" fill="currentColor"/></svg>'
  }
];

let pdfDoc: any = null;

// 获取页面在容器中的绝对位置（使用 offset，不受 CSS transform 影响）
const getPageAbsolutePosition = (pageNum: number) => {
  const pageEl = pageRefs.get(pageNum);
  if (!pageEl) return { left: 0, top: 0 };

  // 使用 offsetLeft/offsetTop，它们返回元素在文档流中的原始位置
  // 不受 CSS transform 影响，这样批注和页面在同一个坐标系中
  return {
    left: pageEl.offsetLeft,
    top: pageEl.offsetTop
  };
};

// 获取批注样式（不需要手动缩放，CSS transform 会自动处理）
const getAnnotationStyle = (annotation: Annotation) => {
  // 判断是否是正在拖拽的批注（通过 ID 比较，避免引用问题）
  const isBeingDragged = isDragging.value && selectedAnnotation.value?.id === annotation.id;

  let pageNum = annotation.pageNum;
  let x = annotation.x;
  let y = annotation.y;

  // 如果正在拖拽，使用临时的页码和偏移
  if (isBeingDragged && dragTargetPage.value !== null) {
    pageNum = dragTargetPage.value;
    x = annotation.x + dragOffset.value.x;
    y = annotation.y + dragOffset.value.y;
  }

  const pagePos = getPageAbsolutePosition(pageNum);

  // 当前的缩放比例
  const currentScale = scale.value / initialScale.value;

  // 批注坐标是标准坐标（基于 initialScale）
  // 批注位置需要根据当前缩放调整,但批注本身大小不变
  const style: any = {
    left: `${(pagePos.left + x) * currentScale}px`,
    top: `${(pagePos.top + y) * currentScale}px`,
    // 批注本身反向缩放,抵消pages-wrapper的缩放,保持原始大小
    transform: `scale(${1 / currentScale})`,
    transformOrigin: 'top left',
    // 禁用过渡动画，实现无感缩放和拖拽
    transition: 'none',
    // 确保拖拽时有更高的 z-index
    zIndex: isBeingDragged ? 10000 : 'auto'
  };

  if (annotation.type === 'rectangle' || annotation.type === 'circle') {
    style.width = `${Math.abs(annotation.width)}px`;
    style.height = `${Math.abs(annotation.height)}px`;
  } else if (annotation.type === 'line') {
    style.width = `${Math.abs(annotation.width)}px`;
    style.height = `${Math.abs(annotation.height)}px`;
  }

  return style;
};

const getLineEndX = (annotation: Annotation) => {
  return annotation.width;
};

const getLineEndY = (annotation: Annotation) => {
  return annotation.height;
};

const getTempAnnotationStyle = () => {
  if (!tempAnnotation.value) return {};

  const pagePos = getPageAbsolutePosition(tempAnnotation.value.pageNum);

  const width = tempAnnotation.value.width;
  const height = tempAnnotation.value.height;

  // 起点固定，使用 transform 来翻转
  const scaleX = width < 0 ? -1 : 1;
  const scaleY = height < 0 ? -1 : 1;

  // 当前的缩放比例
  const currentScale = scale.value / initialScale.value;

  // 起点位置根据缩放调整,但批注本身大小不变
  const style: any = {
    left: `${(pagePos.left + tempAnnotation.value.x) * currentScale}px`,
    top: `${(pagePos.top + tempAnnotation.value.y) * currentScale}px`,
    width: `${Math.abs(width)}px`,
    height: `${Math.abs(height)}px`,
    transformOrigin: 'top left',
    // 反向缩放抵消PDF缩放,并应用翻转
    transform: `scale(${scaleX / currentScale}, ${scaleY / currentScale})`
  };

  return style;
};

const textInputStyle = computed(() => {
  if (!showTextInput.value) return {};

  // 文字输入框在 pages-wrapper 外部，需要计算在视口中的实际位置
  const pageEl = pageRefs.get(textInputPos.value.pageNum);
  if (!pageEl || !containerRef.value) return {};

  const pageRect = pageEl.getBoundingClientRect();
  const containerRect = containerRef.value.getBoundingClientRect();

  // textInputPos 是标准坐标，需要转换为缩放后的显示坐标
  const currentScale = scale.value / initialScale.value;
  const displayX = textInputPos.value.x * currentScale;
  const displayY = textInputPos.value.y * currentScale;

  return {
    left: `${pageRect.left - containerRect.left + displayX}px`,
    top: `${pageRect.top - containerRect.top + displayY - 40}px`
  };
});

// 渲染 PDF (使用高分辨率渲染,然后CSS缩放显示)
const renderPagePDF = async (pageNum: number) => {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);

  // 使用 renderScale 渲染高分辨率PDF
  const viewport = page.getViewport({ scale: renderScale.value });

  const canvas = pdfCanvasRefs.get(pageNum);
  if (!canvas) return;

  const context = canvas.getContext('2d')!;

  // 设置canvas的实际像素尺寸(高分辨率)
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // 设置canvas的CSS显示尺寸(基于initialScale)
  const displayViewport = page.getViewport({ scale: initialScale.value });
  canvas.style.width = `${displayViewport.width}px`;
  canvas.style.height = `${displayViewport.height}px`;

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
};

const renderAllPages = async () => {
  for (let pageNum = 1; pageNum <= totalPages.value; pageNum++) {
    await renderPagePDF(pageNum);
  }
};

// 添加到历史
const addToHistory = () => {
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(JSON.parse(JSON.stringify(annotations.value)));
  historyIndex.value++;
};

// 鼠标事件（优化版本：使用全局监听，检查按钮状态）
const handleMouseDown = (e: MouseEvent, pageNum: number) => {
  if (e.button !== 0) return; // 只响应左键
  if (!activeTool.value) return; // 没有选中工具时不响应

  const pageEl = pageRefs.get(pageNum);
  if (!pageEl) return;

  e.preventDefault();
  e.stopPropagation();

  const rect = pageEl.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 缩放比例：将当前缩放下的坐标转换为标准坐标（基于 initialScale）
  const scaleRatio = scale.value / initialScale.value;
  const x = mouseX / scaleRatio;
  const y = mouseY / scaleRatio;

  if (activeTool.value === 'text') {
    textInputPos.value = { x, y, pageNum };
    textInputValue.value = '';
    showTextInput.value = true;
    nextTick(() => {
      textInputRef.value?.focus();
    });
    return;
  }

  isDrawing.value = true;
  startPos.value = { x, y };
  tempAnnotation.value = {
    type: activeTool.value,
    pageNum,
    x,
    y,
    width: 0,
    height: 0
  };

  // 添加全局监听器
  document.addEventListener('mousemove', handleDrawingMouseMove);
  document.addEventListener('mouseup', handleDrawingMouseUp);
  document.addEventListener('mouseleave', handleDrawingMouseUp);
};

const handleDrawingMouseMove = (e: MouseEvent) => {
  // 检查左键是否按下
  if (e.buttons !== 1) {
    handleDrawingMouseUp();
    return;
  }

  if (!isDrawing.value || !tempAnnotation.value) return;

  e.preventDefault();

  // 使用 requestAnimationFrame 节流，避免每次 mousemove 都更新
  if (drawingRafId !== null) {
    return; // 如果已经有待处理的更新，跳过本次
  }

  drawingRafId = requestAnimationFrame(() => {
    drawingRafId = null;

    if (!isDrawing.value || !tempAnnotation.value) return;

    const pageEl = pageRefs.get(tempAnnotation.value.pageNum);
    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 转换为标准坐标
    const scaleRatio = scale.value / initialScale.value;
    const x = mouseX / scaleRatio;
    const y = mouseY / scaleRatio;

    tempAnnotation.value.width = x - startPos.value.x;
    tempAnnotation.value.height = y - startPos.value.y;
  });
};

const handleDrawingMouseUp = () => {
  // 清理 RAF 请求
  if (drawingRafId !== null) {
    cancelAnimationFrame(drawingRafId);
    drawingRafId = null;
  }

  if (!isDrawing.value || !tempAnnotation.value) {
    // 清理事件监听器
    document.removeEventListener('mousemove', handleDrawingMouseMove);
    document.removeEventListener('mouseup', handleDrawingMouseUp);
    document.removeEventListener('mouseleave', handleDrawingMouseUp);
    return;
  }

  if (Math.abs(tempAnnotation.value.width) > 5 || Math.abs(tempAnnotation.value.height) > 5) {
    const toolType = tempAnnotation.value.type as 'rectangle' | 'circle' | 'line';
    const defaults = toolDefaults.value[toolType];

    const annotation: Annotation = {
      id: Date.now().toString(),
      type: tempAnnotation.value.type,
      pageNum: tempAnnotation.value.pageNum,
      x: tempAnnotation.value.width < 0 ? tempAnnotation.value.x + tempAnnotation.value.width : tempAnnotation.value.x,
      y: tempAnnotation.value.height < 0 ? tempAnnotation.value.y + tempAnnotation.value.height : tempAnnotation.value.y,
      width: Math.abs(tempAnnotation.value.width),
      height: Math.abs(tempAnnotation.value.height),
      // 使用工具的默认值
      color: defaults.color,
      lineWidth: defaults.lineWidth,
      fillColor: (defaults as any).fillColor || 'transparent'
    };
    annotations.value.push(annotation);
    addToHistory();
  }

  isDrawing.value = false;
  tempAnnotation.value = null;

  // 清理事件监听器
  document.removeEventListener('mousemove', handleDrawingMouseMove);
  document.removeEventListener('mouseup', handleDrawingMouseUp);
  document.removeEventListener('mouseleave', handleDrawingMouseUp);
};

// 保留原有的 handleMouseMove 和 handleMouseUp 用于 drawing-layer 的初始绑定
const handleMouseMove = (e: MouseEvent) => {
  // 这个函数现在主要用于兼容，实际逻辑在 handleDrawingMouseMove 中
};

const handleMouseUp = () => {
  // 这个函数现在主要用于兼容，实际逻辑在 handleDrawingMouseUp 中
};

// ============ 触摸事件支持 ============

// 获取触摸点坐标（兼容触摸和鼠标）
const getEventCoordinates = (e: MouseEvent | TouchEvent) => {
  if ('touches' in e && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  } else if ('changedTouches' in e && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  } else {
    return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
  }
};

// 触摸绘制事件
const handleTouchStart = (e: TouchEvent, pageNum: number) => {
  if (e.touches.length !== 1) return; // 只支持单点触摸绘制
  if (!activeTool.value) return; // 没有选中工具时不响应

  isTouching.value = true;
  e.preventDefault();

  const pageEl = pageRefs.get(pageNum);
  if (!pageEl) return;

  const touch = e.touches[0];
  const rect = pageEl.getBoundingClientRect();
  const mouseX = touch.clientX - rect.left;
  const mouseY = touch.clientY - rect.top;

  const scaleRatio = scale.value / initialScale.value;
  const x = mouseX / scaleRatio;
  const y = mouseY / scaleRatio;

  if (activeTool.value === 'text') {
    textInputPos.value = { x, y, pageNum };
    textInputValue.value = '';
    showTextInput.value = true;
    nextTick(() => {
      textInputRef.value?.focus();
    });
    return;
  }

  isDrawing.value = true;
  startPos.value = { x, y };
  tempAnnotation.value = {
    type: activeTool.value,
    pageNum,
    x,
    y,
    width: 0,
    height: 0
  };

  // 添加触摸监听器
  document.addEventListener('touchmove', handleDrawingTouchMove, { passive: false });
  document.addEventListener('touchend', handleDrawingTouchEnd);
  document.addEventListener('touchcancel', handleDrawingTouchEnd);
};

const handleDrawingTouchMove = (e: TouchEvent) => {
  if (!isDrawing.value || !tempAnnotation.value || e.touches.length !== 1) return;

  e.preventDefault();

  if (drawingRafId !== null) {
    return;
  }

  drawingRafId = requestAnimationFrame(() => {
    drawingRafId = null;

    if (!isDrawing.value || !tempAnnotation.value) return;

    const pageEl = pageRefs.get(tempAnnotation.value.pageNum);
    if (!pageEl) return;

    const touch = e.touches[0];
    const rect = pageEl.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left;
    const mouseY = touch.clientY - rect.top;

    const scaleRatio = scale.value / initialScale.value;
    const x = mouseX / scaleRatio;
    const y = mouseY / scaleRatio;

    tempAnnotation.value.width = x - startPos.value.x;
    tempAnnotation.value.height = y - startPos.value.y;
  });
};

const handleDrawingTouchEnd = () => {
  if (drawingRafId !== null) {
    cancelAnimationFrame(drawingRafId);
    drawingRafId = null;
  }

  if (!isDrawing.value || !tempAnnotation.value) {
    document.removeEventListener('touchmove', handleDrawingTouchMove);
    document.removeEventListener('touchend', handleDrawingTouchEnd);
    document.removeEventListener('touchcancel', handleDrawingTouchEnd);
    isTouching.value = false;
    return;
  }

  if (Math.abs(tempAnnotation.value.width) > 5 || Math.abs(tempAnnotation.value.height) > 5) {
    const toolType = tempAnnotation.value.type as 'rectangle' | 'circle' | 'line';
    const defaults = toolDefaults.value[toolType];

    const annotation: Annotation = {
      id: Date.now().toString(),
      type: tempAnnotation.value.type,
      pageNum: tempAnnotation.value.pageNum,
      x: tempAnnotation.value.width < 0 ? tempAnnotation.value.x + tempAnnotation.value.width : tempAnnotation.value.x,
      y: tempAnnotation.value.height < 0 ? tempAnnotation.value.y + tempAnnotation.value.height : tempAnnotation.value.y,
      width: Math.abs(tempAnnotation.value.width),
      height: Math.abs(tempAnnotation.value.height),
      color: defaults.color,
      lineWidth: defaults.lineWidth,
      fillColor: (defaults as any).fillColor || 'transparent'
    };
    annotations.value.push(annotation);
    addToHistory();
  }

  isDrawing.value = false;
  tempAnnotation.value = null;
  isTouching.value = false;

  document.removeEventListener('touchmove', handleDrawingTouchMove);
  document.removeEventListener('touchend', handleDrawingTouchEnd);
  document.removeEventListener('touchcancel', handleDrawingTouchEnd);
};

// 触摸拖拽批注
const handleAnnotationTouchStart = (e: TouchEvent, annotation: Annotation) => {
  if (e.touches.length !== 1) return;
  if (isResizing.value) return;

  e.preventDefault();
  e.stopPropagation();

  isTouching.value = true;

  activeTool.value = annotation.type;
  selectedAnnotation.value = annotation;
  showToolPopover.value = true;

  isDragging.value = true;
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = annotation.pageNum;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  const touch = e.touches[0];
  const wrapperRect = wrapper.getBoundingClientRect();
  const pagePos = getPageAbsolutePosition(annotation.pageNum);
  const scaleRatio = scale.value / initialScale.value;

  const annotationStandardLeft = pagePos.left + annotation.x;
  const annotationStandardTop = pagePos.top + annotation.y;
  const annotationDisplayLeft = annotationStandardLeft * scaleRatio;
  const annotationDisplayTop = annotationStandardTop * scaleRatio;

  const mouseXInWrapper = touch.clientX - wrapperRect.left;
  const mouseYInWrapper = touch.clientY - wrapperRect.top;

  startPos.value = {
    x: mouseXInWrapper - annotationDisplayLeft,
    y: mouseYInWrapper - annotationDisplayTop
  };

  document.addEventListener('touchmove', handleAnnotationTouchMove, { passive: false });
  document.addEventListener('touchend', handleAnnotationTouchEnd);
  document.addEventListener('touchcancel', handleAnnotationTouchEnd);
};

const handleAnnotationTouchMove = (e: TouchEvent) => {
  if (e.touches.length !== 1) {
    handleAnnotationTouchEnd();
    return;
  }

  if (!isDragging.value || !selectedAnnotation.value) return;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  e.preventDefault();

  const touch = e.touches[0];
  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / initialScale.value;

  const mouseXInWrapper = touch.clientX - wrapperRect.left;
  const mouseYInWrapper = touch.clientY - wrapperRect.top;

  let targetPageNum = selectedAnnotation.value.pageNum;
  for (let i = 1; i <= totalPages.value; i++) {
    const pageEl = pageRefs.get(i);
    if (!pageEl) continue;
    const pageRect = pageEl.getBoundingClientRect();
    if (touch.clientY >= pageRect.top && touch.clientY <= pageRect.bottom) {
      targetPageNum = i;
      break;
    }
  }

  dragTargetPage.value = targetPageNum;
  const pagePos = getPageAbsolutePosition(targetPageNum);

  const newAnnotationDisplayLeft = mouseXInWrapper - startPos.value.x;
  const newAnnotationDisplayTop = mouseYInWrapper - startPos.value.y;

  const newAnnotationStandardLeft = newAnnotationDisplayLeft / scaleRatio;
  const newAnnotationStandardTop = newAnnotationDisplayTop / scaleRatio;

  const newAnnotationX = newAnnotationStandardLeft - pagePos.left;
  const newAnnotationY = newAnnotationStandardTop - pagePos.top;

  dragOffset.value = {
    x: newAnnotationX - selectedAnnotation.value.x,
    y: newAnnotationY - selectedAnnotation.value.y
  };
};

const handleAnnotationTouchEnd = () => {
  if (!isDragging.value) return;

  if (selectedAnnotation.value && dragTargetPage.value !== null) {
    const targetId = selectedAnnotation.value.id;
    const sameIdAnnotations = annotations.value.filter(a => a.id === targetId);

    if (sameIdAnnotations.length > 1) {
      console.warn(`发现重复的批注 ID: ${targetId}，数量: ${sameIdAnnotations.length}`);
      annotations.value = annotations.value.filter(a => a.id !== targetId);
      annotations.value.push(sameIdAnnotations[0]);
    }

    const annotationIndex = annotations.value.findIndex(a => a.id === targetId);
    if (annotationIndex !== -1) {
      annotations.value[annotationIndex].pageNum = dragTargetPage.value;
      annotations.value[annotationIndex].x += dragOffset.value.x;
      annotations.value[annotationIndex].y += dragOffset.value.y;
      selectedAnnotation.value = annotations.value[annotationIndex];
      addToHistory();
    }
  }

  isDragging.value = false;
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = null;
  isTouching.value = false;

  document.removeEventListener('touchmove', handleAnnotationTouchMove);
  document.removeEventListener('touchend', handleAnnotationTouchEnd);
  document.removeEventListener('touchcancel', handleAnnotationTouchEnd);
};

// 批注拖拽（性能优化版本 + 缩放适配）
const handleAnnotationMouseDown = (e: MouseEvent, annotation: Annotation) => {
  if (e.button !== 0) return; // 只响应左键
  if (isResizing.value) return; // 正在调整大小时不触发拖拽

  e.preventDefault();
  e.stopPropagation();

  // 点击批注时，将工具切换为该批注的类型并选中该批注
  activeTool.value = annotation.type;
  selectedAnnotation.value = annotation;

  // 显示工具弹窗
  showToolPopover.value = true;

  isDragging.value = true;

  // 重置拖拽偏移
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = annotation.pageNum;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const pagePos = getPageAbsolutePosition(annotation.pageNum);
  const scaleRatio = scale.value / initialScale.value;

  // 计算鼠标点击位置相对于批注左上角的偏移量
  // 批注在 wrapper 内的标准位置
  const annotationStandardLeft = pagePos.left + annotation.x;
  const annotationStandardTop = pagePos.top + annotation.y;

  // 由于 wrapper 有 CSS transform: scale(scaleRatio)，批注的实际显示位置需要乘以 scaleRatio
  const annotationDisplayLeft = annotationStandardLeft * scaleRatio;
  const annotationDisplayTop = annotationStandardTop * scaleRatio;

  // 鼠标在 wrapper 坐标系中的位置（相对于 wrapper 的 content box）
  const mouseXInWrapper = e.clientX - wrapperRect.left;
  const mouseYInWrapper = e.clientY - wrapperRect.top;

  // 偏移量（显示坐标系）
  startPos.value = {
    x: mouseXInWrapper - annotationDisplayLeft,
    y: mouseYInWrapper - annotationDisplayTop
  };

  // 添加事件监听
  document.addEventListener('mousemove', handleAnnotationDrag);
  document.addEventListener('mouseup', handleAnnotationDragEnd);
  // 额外添加 mouseleave 确保一定会清理
  document.addEventListener('mouseleave', handleAnnotationDragEnd);
};

const handleAnnotationDrag = (e: MouseEvent) => {
  // 检查鼠标左键是否按下
  if (e.buttons !== 1) {
    handleAnnotationDragEnd();
    return;
  }

  if (!isDragging.value || !selectedAnnotation.value) return;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  e.preventDefault();

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / initialScale.value;

  // 鼠标在 wrapper 坐标系中的位置（视口坐标，受 transform 影响）
  const mouseXInWrapper = e.clientX - wrapperRect.left;
  const mouseYInWrapper = e.clientY - wrapperRect.top;

  // 检测鼠标当前在哪个页面上
  let targetPageNum = selectedAnnotation.value.pageNum;
  for (let i = 1; i <= totalPages.value; i++) {
    const pageEl = pageRefs.get(i);
    if (!pageEl) continue;
    const pageRect = pageEl.getBoundingClientRect();
    if (e.clientY >= pageRect.top && e.clientY <= pageRect.bottom) {
      targetPageNum = i;
      break;
    }
  }

  // 更新目标页码
  dragTargetPage.value = targetPageNum;

  // 计算批注在目标页面上的新位置
  const pagePos = getPageAbsolutePosition(targetPageNum);

  // 鼠标位置减去偏移，得到批注在 wrapper 中的显示位置
  const newAnnotationDisplayLeft = mouseXInWrapper - startPos.value.x;
  const newAnnotationDisplayTop = mouseYInWrapper - startPos.value.y;

  // 转换为标准坐标系：先减去页面位置，再除以 scaleRatio
  const newAnnotationStandardLeft = newAnnotationDisplayLeft / scaleRatio;
  const newAnnotationStandardTop = newAnnotationDisplayTop / scaleRatio;

  // 批注在页面中的标准坐标
  const newAnnotationX = newAnnotationStandardLeft - pagePos.left;
  const newAnnotationY = newAnnotationStandardTop - pagePos.top;

  // 只更新拖拽偏移量，不修改原始 annotation 数据（性能优化）
  dragOffset.value = {
    x: newAnnotationX - selectedAnnotation.value.x,
    y: newAnnotationY - selectedAnnotation.value.y
  };
};

const handleAnnotationDragEnd = () => {
  if (!isDragging.value) return;

  // 拖拽结束时，将临时偏移应用到实际 annotation 数据
  if (selectedAnnotation.value && dragTargetPage.value !== null) {
    const targetId = selectedAnnotation.value.id;

    // 查找所有具有相同 ID 的批注（防止重复）
    const sameIdAnnotations = annotations.value.filter(a => a.id === targetId);

    if (sameIdAnnotations.length > 1) {
      // 如果有重复，先删除所有重复的
      console.warn(`发现重复的批注 ID: ${targetId}，数量: ${sameIdAnnotations.length}`);
      annotations.value = annotations.value.filter(a => a.id !== targetId);
      // 添加回一个（使用第一个）
      annotations.value.push(sameIdAnnotations[0]);
    }

    // 找到并更新批注
    const annotationIndex = annotations.value.findIndex(a => a.id === targetId);
    if (annotationIndex !== -1) {
      annotations.value[annotationIndex].pageNum = dragTargetPage.value;
      annotations.value[annotationIndex].x += dragOffset.value.x;
      annotations.value[annotationIndex].y += dragOffset.value.y;
      // 更新 selectedAnnotation 引用，指向数组中的对象
      selectedAnnotation.value = annotations.value[annotationIndex];
      addToHistory();
    }
  }

  // 重置拖拽状态
  isDragging.value = false;
  dragOffset.value = { x: 0, y: 0 };
  dragTargetPage.value = null;

  // 清理所有事件监听器
  document.removeEventListener('mousemove', handleAnnotationDrag);
  document.removeEventListener('mouseup', handleAnnotationDragEnd);
  document.removeEventListener('mouseleave', handleAnnotationDragEnd);
};

// 调整大小功能
const handleResizeStart = (e: MouseEvent, annotation: Annotation, handle: string) => {
  if (e.button !== 0) return;

  e.preventDefault();
  e.stopPropagation();

  isResizing.value = true;
  resizeHandle.value = handle;
  selectedAnnotation.value = annotation;

  // 保存原始批注数据
  resizeOriginalAnnotation.value = JSON.parse(JSON.stringify(annotation));

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / initialScale.value;

  resizeStartPos.value = {
    x: (e.clientX - wrapperRect.left) / scaleRatio,
    y: (e.clientY - wrapperRect.top) / scaleRatio
  };

  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
  document.addEventListener('mouseleave', handleResizeEnd);
};

const handleResizeMove = (e: MouseEvent) => {
  if (e.buttons !== 1) {
    handleResizeEnd();
    return;
  }

  if (!isResizing.value || !selectedAnnotation.value || !resizeOriginalAnnotation.value) return;

  const wrapper = pagesWrapperRef.value;
  if (!wrapper) return;

  e.preventDefault();

  const wrapperRect = wrapper.getBoundingClientRect();
  const scaleRatio = scale.value / initialScale.value;

  // 转换为标准坐标
  const mouseX = (e.clientX - wrapperRect.left) / scaleRatio;
  const mouseY = (e.clientY - wrapperRect.top) / scaleRatio;

  const dx = mouseX - resizeStartPos.value.x;
  const dy = mouseY - resizeStartPos.value.y;

  const original = resizeOriginalAnnotation.value;
  const pagePos = getPageAbsolutePosition(original.pageNum);

  // 找到批注在数组中的索引
  const annotationIndex = annotations.value.findIndex(a => a.id === selectedAnnotation.value!.id);
  if (annotationIndex === -1) return;

  const isCircle = annotations.value[annotationIndex].type === 'circle';

  // 根据不同的 handle 调整不同的属性
  switch (resizeHandle.value) {
    case 'se': // 东南角：改变 width 和 height
      if (isCircle) {
        // 圆形保持宽高相同，取较大值
        const size = Math.max(10, Math.max(original.width + dx, original.height + dy));
        annotations.value[annotationIndex].width = size;
        annotations.value[annotationIndex].height = size;
      } else {
        annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
        annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
      }
      break;

    case 'sw': // 西南角：改变 x, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width - dx, original.height + dy));
          annotations.value[annotationIndex].x = original.x + original.width - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          const newWidth = Math.max(10, original.width - dx);
          annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
          annotations.value[annotationIndex].width = newWidth;
          annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
        }
      }
      break;

    case 'ne': // 东北角：改变 y, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width + dx, original.height - dy));
          annotations.value[annotationIndex].y = original.y + original.height - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
          const newHeight = Math.max(10, original.height - dy);
          annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
          annotations.value[annotationIndex].height = newHeight;
        }
      }
      break;

    case 'nw': // 西北角：改变 x, y, width 和 height
      {
        if (isCircle) {
          const size = Math.max(10, Math.max(original.width - dx, original.height - dy));
          annotations.value[annotationIndex].x = original.x + original.width - size;
          annotations.value[annotationIndex].y = original.y + original.height - size;
          annotations.value[annotationIndex].width = size;
          annotations.value[annotationIndex].height = size;
        } else {
          const newWidth = Math.max(10, original.width - dx);
          const newHeight = Math.max(10, original.height - dy);
          annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
          annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
          annotations.value[annotationIndex].width = newWidth;
          annotations.value[annotationIndex].height = newHeight;
        }
      }
      break;

    case 'e': // 东边：只改变 width
      annotations.value[annotationIndex].width = Math.max(10, original.width + dx);
      break;

    case 'w': // 西边：改变 x 和 width
      {
        const newWidth = Math.max(10, original.width - dx);
        annotations.value[annotationIndex].x = original.x + (original.width - newWidth);
        annotations.value[annotationIndex].width = newWidth;
      }
      break;

    case 's': // 南边：只改变 height
      annotations.value[annotationIndex].height = Math.max(10, original.height + dy);
      break;

    case 'n': // 北边：改变 y 和 height
      {
        const newHeight = Math.max(10, original.height - dy);
        annotations.value[annotationIndex].y = original.y + (original.height - newHeight);
        annotations.value[annotationIndex].height = newHeight;
      }
      break;
  }

  // 更新选中的批注引用
  selectedAnnotation.value = annotations.value[annotationIndex];
};

const handleResizeEnd = () => {
  if (!isResizing.value) return;

  if (selectedAnnotation.value) {
    addToHistory();
  }

  isResizing.value = false;
  resizeHandle.value = null;
  resizeOriginalAnnotation.value = null;

  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
  document.removeEventListener('mouseleave', handleResizeEnd);
};

// 文字输入
const handleTextInputConfirm = () => {
  if (textInputValue.value.trim()) {
    const newText = textInputValue.value.trim();
    const newPageNum = textInputPos.value.pageNum;
    const newX = textInputPos.value.x;
    const newY = textInputPos.value.y;

    // 检查是否已经有相同位置和文字的批注（防止重复添加）
    const isDuplicate = annotations.value.some(a =>
      a.type === 'text' &&
      a.text === newText &&
      a.pageNum === newPageNum &&
      Math.abs(a.x - newX) < 5 &&
      Math.abs(a.y - newY) < 5
    );

    if (!isDuplicate) {
      const defaults = toolDefaults.value.text;

      const annotation: Annotation = {
        id: Date.now().toString(),
        type: 'text',
        pageNum: newPageNum,
        x: newX,
        y: newY,
        width: 0,
        height: 20,
        text: newText,
        // 使用工具的默认值
        color: defaults.color,
        fontSize: defaults.fontSize,
        lineWidth: defaults.lineWidth
      };
      annotations.value.push(annotation);
      addToHistory();
    } else {
      console.warn('检测到重复的文字批注，已跳过添加');
    }
  }
  showTextInput.value = false;
  textInputValue.value = '';
};

const handleTextInputBlur = () => {
  setTimeout(() => {
    handleTextInputConfirm();
  }, 100);
};

const handleTextInputCancel = () => {
  showTextInput.value = false;
};

// 工具栏操作（无感缩放：只改变 scale，通过 CSS transform 应用）
const handleZoomIn = () => {
  scale.value = Math.min(scale.value + 0.2, 3.0);
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleZoomOut = () => {
  scale.value = Math.max(scale.value - 0.2, 0.5);
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleResetZoom = () => {
  scale.value = initialScale.value;
  // 不重新渲染 PDF，使用 CSS transform 缩放
};

const handleActivateTool = (toolName: string) => {
  // 如果点击的是当前激活的工具，取消选中
  if (activeTool.value === toolName) {
    activeTool.value = null;
    showToolPopover.value = false;
  } else {
    // 激活新工具并显示弹窗
    activeTool.value = toolName;
    showToolPopover.value = true;
  }

  // 切换工具时，关闭文字输入框（防止重复添加）
  if (showTextInput.value) {
    showTextInput.value = false;
    textInputValue.value = '';
  }
};

// 切换移动端菜单
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
};

// 更新工具默认值
const updateToolDefault = (toolName: string, property: string, value: any) => {
  (toolDefaults.value as any)[toolName][property] = value;
};

// 更新选中批注的属性
const updateAnnotationProperty = (property: string, value: any) => {
  if (!selectedAnnotation.value) return;

  const annotationIndex = annotations.value.findIndex(a => a.id === selectedAnnotation.value!.id);
  if (annotationIndex === -1) return;

  // 更新属性
  (annotations.value[annotationIndex] as any)[property] = value;

  // 更新选中的批注引用
  selectedAnnotation.value = annotations.value[annotationIndex];

  // 添加到历史记录
  addToHistory();
};

const handleDeleteSelected = () => {
  if (selectedAnnotation.value) {
    annotations.value = annotations.value.filter(a => a.id !== selectedAnnotation.value!.id);
    selectedAnnotation.value = null;
    showAnnotationPopover.value = false;
    addToHistory();
  }
};

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
  }
};

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    annotations.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
  }
};

const handleClearAll = () => {
  if (confirm('确定清空所有批注吗？')) {
    annotations.value = [];
    selectedAnnotation.value = null;
    addToHistory();
  }
};

const handleExport = () => {
  const data = JSON.stringify(annotations.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'annotations.json';
  a.click();
  URL.revokeObjectURL(url);
};

// 计算适合移动端的初始scale
const calculateInitialScale = async () => {
  if (!pdfDoc || !containerRef.value) return;

  // 获取第一页来计算合适的scale
  const firstPage = await pdfDoc.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1.0 });

  // 获取容器宽度(减去一些padding)
  const containerWidth = containerRef.value.clientWidth - 40; // 左右各20px padding
  const pdfWidth = viewport.width;

  // 计算适合屏幕宽度的scale
  const fitWidthScale = containerWidth / pdfWidth;

  // 在移动端,使用适合屏幕宽度的scale;在PC端,使用默认的1.5
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    initialScale.value = fitWidthScale;
    scale.value = fitWidthScale;
    // 移动端使用更高的渲染分辨率(4倍)以支持放大
    renderScale.value = fitWidthScale * 4;
  } else {
    initialScale.value = 1.5;
    scale.value = 1.5;
    // PC端使用3倍渲染分辨率
    renderScale.value = 3.0;
  }

  console.log('初始scale计算完成:', {
    isMobile,
    containerWidth,
    pdfWidth,
    initialScale: initialScale.value,
    renderScale: renderScale.value
  });
};

// 初始化
onMounted(async () => {
  try {
    console.log('开始加载 PDF:', props.url);

    const loadingTask = pdfjsLib.getDocument(props.url);
    pdfDoc = await loadingTask.promise;

    console.log('PDF 加载成功，总页数:', pdfDoc.numPages);
    totalPages.value = pdfDoc.numPages;

    // 先计算适合的初始scale
    await calculateInitialScale();

    isLoaded.value = true;

    await nextTick();
    await renderAllPages();

    history.value = [[]];
    historyIndex.value = 0;

    console.log('所有页面渲染完成');
  } catch (error) {
    console.error('PDF 加载失败:', error);
  }
});
</script>

<style scoped>
.dom-based-pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.toolbar {
  background: white;
  border-bottom: 1px solid #ddd;
  z-index: 10;
}

/* PC端工具栏 */
.toolbar-desktop {
  display: flex;
  gap: 20px;
  padding: 10px 20px;
  flex-wrap: wrap;
}

/* 移动端工具栏默认隐藏 */
.toolbar-mobile {
  display: none;
}

.toolbar-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 工具按钮组 */
.tool-buttons-group {
  position: relative;
}

.tool-button-wrapper {
  position: relative;
  display: inline-block;
}

/* Popover样式 */
.tool-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  min-width: 220px;
  z-index: 1000;
}

.popover-arrow {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: white;
  border-left: 1px solid #ddd;
  border-top: 1px solid #ddd;
  transform: translateX(-50%) rotate(45deg);
}

.popover-content {
  position: relative;
  z-index: 1;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.popover-item:last-child {
  margin-bottom: 0;
}

.popover-item label {
  font-size: 13px;
  color: #555;
  min-width: 50px;
  font-weight: 500;
}

.popover-item input[type="color"] {
  width: 50px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.popover-item input[type="range"] {
  flex: 1;
  cursor: pointer;
  min-width: 100px;
}

.popover-item .value-display {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.popover-item .mini-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.popover-item .mini-btn:hover {
  background: #f0f0f0;
  border-color: #999;
}

button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

button svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

button:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* 图标按钮样式 */
.icon-button {
  padding: 8px;
  min-width: 36px;
  min-height: 36px;
}

.icon-button svg {
  width: 20px;
  height: 20px;
}

.scale-display,
.page-info {
  padding: 6px 12px;
  background: #f8f8f8;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}

.pdf-container {
  flex: 1;
  overflow: auto;
  background: #525659;
  position: relative;
}

.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  position: relative;
  min-height: 100%;
}

.page-wrapper {
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  background: white;
}

canvas {
  display: block;
}

.drawing-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

/* 批注容器 - 绝对定位层 */
.annotations-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

/* 批注基础样式 */
.annotation {
  position: absolute;
  pointer-events: auto;
  transition: all 0.1s;
}

.annotation.selected {
  z-index: 1001;
}

.annotation-rectangle .annotation-border,
.annotation-circle .annotation-border {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border-style: solid; /* 确保边框样式为实线 */
}

.annotation-circle .annotation-border {
  border-radius: 50%;
}

.annotation.selected .annotation-border {
  box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
}

.annotation-border.dashed {
  border-style: dashed;
}

.annotation-line {
  overflow: visible;
}

.annotation-text {
  font-family: Arial, sans-serif;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  border-style: solid; /* 确保边框样式为实线 */
  border-radius: 4px;
  white-space: nowrap;
  cursor: move;
}

.annotation-text.selected {
  border-width: 3px;
  box-shadow: 0 0 10px rgba(0, 102, 255, 0.5);
}

.temp-annotation {
  opacity: 0.7;
}

/* 文字输入框 */
.text-input-wrapper {
  position: absolute;
  z-index: 10000;
  pointer-events: auto;
}

.text-input {
  padding: 8px 12px;
  border: 3px solid #007bff;
  border-radius: 6px;
  font-size: 16px;
  font-family: Arial, sans-serif;
  min-width: 250px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.text-input:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 属性编辑面板 - 顶部固定 (已废弃，改用popover) */

/* 调整大小控制点 */
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #0066ff;
  border: 1px solid white;
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
  z-index: 10;
  pointer-events: auto;
}

.resize-handle:hover {
  width: 10px;
  height: 10px;
  background: #0052cc;
}

/* 四个角 */
.resize-handle.nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.resize-handle.ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.resize-handle.sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.resize-handle.se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

/* 四条边 */
.resize-handle.n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-handle.e {
  top: 50%;
  right: -4px;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-handle.s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-handle.w {
  top: 50%;
  left: -4px;
  transform: translateY(-50%);
  cursor: w-resize;
}

/* ============ 移动端适配 ============ */
@media screen and (max-width: 768px) {
  /* 工具栏移动端优化 */
  .toolbar {
    gap: 10px;
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .toolbar-group {
    gap: 6px;
    flex-shrink: 0;
  }

  /* 按钮加大便于触摸 */
  button {
    padding: 10px 16px;
    font-size: 15px;
    min-height: 44px; /* iOS推荐的最小触摸目标 */
    touch-action: manipulation; /* 禁用双击缩放 */
  }

  /* 缩放和页面信息显示 */
  .scale-display,
  .page-info {
    padding: 10px 14px;
    font-size: 15px;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  /* Popover在移动端优化 */
  .tool-popover {
    position: fixed;
    top: auto;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 280px;
    max-width: 90vw;
    z-index: 10000;
  }

  .popover-arrow {
    display: none; /* 移动端隐藏箭头 */
  }

  .popover-item {
    margin-bottom: 12px;
  }

  .popover-item label {
    font-size: 14px;
    min-width: 60px;
  }

  .popover-item input[type="color"] {
    width: 60px;
    height: 44px;
  }

  .popover-item .mini-btn {
    padding: 8px 12px;
    font-size: 14px;
    min-height: 44px;
  }

  /* PDF容器适配 */
  .pdf-container {
    -webkit-overflow-scrolling: touch;
  }

  .pages-wrapper {
    padding: 10px 0;
  }

  .page-wrapper {
    margin-bottom: 10px;
  }

  /* 调整大小控制点在移动端加大 */
  .resize-handle {
    width: 12px;
    height: 12px;
    touch-action: none;
  }

  .resize-handle:hover {
    width: 14px;
    height: 14px;
  }

  .resize-handle.nw {
    top: -6px;
    left: -6px;
  }

  .resize-handle.ne {
    top: -6px;
    right: -6px;
  }

  .resize-handle.sw {
    bottom: -6px;
    left: -6px;
  }

  .resize-handle.se {
    bottom: -6px;
    right: -6px;
  }

  .resize-handle.n {
    top: -6px;
  }

  .resize-handle.e {
    right: -6px;
  }

  .resize-handle.s {
    bottom: -6px;
  }

  .resize-handle.w {
    left: -6px;
  }

  /* PC端工具栏隐藏 */
  .toolbar-desktop {
    display: none;
  }

  /* 移动端工具栏显示 */
  .toolbar-mobile {
    display: block !important;
    width: 100%;
  }

  .toolbar-row-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    gap: 8px;
  }

  .icon-button-mobile {
    padding: 8px;
    min-width: 40px;
    min-height: 40px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
  }

  .icon-button-mobile svg {
    width: 20px;
    height: 20px;
  }

  .icon-button-mobile:disabled {
    opacity: 0.5;
  }

  .icon-button-mobile.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .menu-toggle svg.rotated {
    transform: rotate(180deg);
  }

  /* 移动端菜单 */
  .mobile-menu {
    background: white;
    border-bottom: 1px solid #ddd;
    overflow: hidden;
  }

  .mobile-menu-content {
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .mobile-menu-content button {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 70px;
    border: 1px solid #ddd;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    touch-action: manipulation;
  }

  .mobile-menu-content button svg {
    width: 24px;
    height: 24px;
  }

  .mobile-menu-content button span {
    font-size: 13px;
    color: #333;
  }

  .mobile-menu-content button:disabled {
    opacity: 0.5;
  }

  .mobile-menu-content button:not(:disabled):active {
    background: #f0f0f0;
    transform: scale(0.98);
  }

  .mobile-menu-info {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: #f8f8f8;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
  }

  .mobile-menu-info svg {
    width: 20px;
    height: 20px;
  }

  /* 下拉动画 */
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.3s ease;
    max-height: 500px;
  }

  .slide-down-enter-from,
  .slide-down-leave-to {
    max-height: 0;
    opacity: 0;
  }

  /* 文字输入框移动端优化 */
  .text-input {
    padding: 12px 16px;
    font-size: 16px;
    min-width: 280px;
    min-height: 44px;
  }

  /* 批注在移动端的触摸优化 */
  .annotation {
    touch-action: none;
  }

  .annotation-text {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 小屏幕移动端 (手机竖屏) */
@media screen and (max-width: 480px) {
  .toolbar-row-main {
    padding: 6px 8px;
    gap: 6px;
  }

  .icon-button-mobile {
    min-width: 38px;
    min-height: 38px;
    padding: 6px;
  }

  .icon-button-mobile svg {
    width: 18px;
    height: 18px;
  }

  .scale-display {
    font-size: 13px;
    padding: 6px 8px;
  }

  .mobile-menu-content button {
    min-height: 60px;
    padding: 10px;
  }

  .mobile-menu-content button svg {
    width: 20px;
    height: 20px;
  }

  .mobile-menu-content button span {
    font-size: 12px;
  }

  .tool-popover {
    min-width: 260px;
  }
}
</style>
