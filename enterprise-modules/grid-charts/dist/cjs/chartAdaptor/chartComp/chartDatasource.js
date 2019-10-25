"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var grid_core_1 = require("@ag-community/grid-core");
var chartModel_1 = require("./chartModel");
var ChartDatasource = /** @class */ (function (_super) {
    __extends(ChartDatasource, _super);
    function ChartDatasource() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ChartDatasource.prototype.getData = function (params) {
        var result = this.extractRowsFromGridRowModel(params);
        result.data = this.aggregateRowsByDimension(params, result.data);
        return result;
    };
    ChartDatasource.prototype.extractRowsFromGridRowModel = function (params) {
        var _this = this;
        var extractedRowData = [];
        var columnNames = {};
        // maps used to keep track of expanded groups that need to be removed
        var groupNodeIndexes = {};
        var groupsToRemove = {};
        // make sure enough rows in range to chart. if user filters and less rows, then end row will be
        // the last displayed row, not where the range ends.
        var modelLastRow = this.gridRowModel.getRowCount() - 1;
        var rangeLastRow = params.endRow > 0 ? Math.min(params.endRow, modelLastRow) : modelLastRow;
        var numRows = rangeLastRow - params.startRow + 1;
        var _loop_1 = function (i) {
            var data = {};
            var rowNode = this_1.gridRowModel.getRow(i + params.startRow);
            // first get data for dimensions columns
            params.dimensionCols.forEach(function (col) {
                var colId = col.colId;
                var column = _this.columnController.getGridColumn(colId);
                if (column) {
                    var valueObject = _this.valueService.getValue(column, rowNode);
                    // when grouping we also need to build up multi category labels for charts
                    if (params.grouping) {
                        var valueString = valueObject && valueObject.toString ? String(valueObject.toString()) : '';
                        // traverse parents to extract group label path
                        var labels_1 = _this.getGroupLabels(rowNode, valueString);
                        if (params.multiCategories) {
                            // add group labels to group column for multi category charts
                            data[colId] = { labels: labels_1, toString: function () { return labels_1[0]; } };
                        }
                        else {
                            // concat group keys from the top group key down (used when grouping Pie charts)
                            data[colId] = labels_1.slice().reverse().join(' - ');
                        }
                        // keep track of group node indexes so they can be padded when other groups are expanded
                        if (rowNode.group) {
                            groupNodeIndexes[labels_1.toString()] = i;
                        }
                        // if node (group or leaf) has parents then it is expanded and should be removed
                        var groupKey = labels_1.slice(1, labels_1.length).toString();
                        if (groupKey) {
                            groupsToRemove[groupKey] = groupNodeIndexes[groupKey];
                        }
                    }
                    else {
                        // leaf nodes can be directly added to dimension columns
                        data[colId] = valueObject;
                    }
                }
                else {
                    // introduce a default category when no dimensions exist with a value based off row index (+1)
                    data[chartModel_1.ChartModel.DEFAULT_CATEGORY] = i + 1;
                }
            });
            // then get data for value columns
            params.valueCols.forEach(function (col) {
                var columnNamesArr = [];
                // pivot keys should be added first
                var pivotKeys = col.getColDef().pivotKeys;
                if (pivotKeys) {
                    columnNamesArr = pivotKeys.slice();
                }
                // then add column header name to results
                var headerName = col.getColDef().headerName;
                if (headerName) {
                    columnNamesArr.push(headerName);
                }
                // add array of column names to results
                if (columnNamesArr.length > 0) {
                    columnNames[col.getId()] = columnNamesArr;
                }
                // add data value to value column
                data[col.getId()] = _this.valueService.getValue(col, rowNode);
            });
            // add data to results
            extractedRowData.push(data);
        };
        var this_1 = this;
        for (var i = 0; i < numRows; i++) {
            _loop_1(i);
        }
        if (params.grouping) {
            var groupIndexesToRemove_1 = grid_core_1._.values(groupsToRemove);
            extractedRowData = extractedRowData.filter(function (value, index) { return !grid_core_1._.includes(groupIndexesToRemove_1, index); });
        }
        return { data: extractedRowData, columnNames: columnNames };
    };
    ChartDatasource.prototype.aggregateRowsByDimension = function (params, dataFromGrid) {
        var _this = this;
        var dimensionCols = params.dimensionCols;
        if (!params.aggFunc || dimensionCols.length === 0) {
            return dataFromGrid;
        }
        var lastCol = grid_core_1._.last(dimensionCols);
        var lastColId = lastCol && lastCol.colId;
        var map = {};
        var dataAggregated = [];
        dataFromGrid.forEach(function (data) {
            var currentMap = map;
            dimensionCols.forEach(function (col) {
                var colId = col.colId;
                var key = data[colId];
                if (colId === lastColId) {
                    var groupItem_1 = currentMap[key];
                    if (!groupItem_1) {
                        groupItem_1 = { __children: [] };
                        dimensionCols.forEach(function (col) {
                            var colId = col.colId;
                            groupItem_1[colId] = data[colId];
                        });
                        currentMap[key] = groupItem_1;
                        dataAggregated.push(groupItem_1);
                    }
                    groupItem_1.__children.push(data);
                }
                else {
                    // map of maps
                    if (!currentMap[key]) {
                        currentMap[key] = {};
                    }
                    currentMap = currentMap[key];
                }
            });
        });
        dataAggregated.forEach(function (groupItem) { return params.valueCols.forEach(function (col) {
            var dataToAgg = groupItem.__children.map(function (child) { return child[col.getId()]; });
            var aggResult = 0;
            if (grid_core_1.ModuleRegistry.assertRegistered(grid_core_1.ModuleNames.RowGroupingModule, 'Charting Aggregation')) {
                aggResult = _this.aggregationStage.aggregateValues(dataToAgg, params.aggFunc);
            }
            groupItem[col.getId()] = aggResult && typeof aggResult.value !== 'undefined' ? aggResult.value : aggResult;
        }); });
        return dataAggregated;
    };
    ChartDatasource.prototype.getGroupLabels = function (rowNode, initialLabel) {
        var labels = [initialLabel];
        while (rowNode.level !== 0) {
            rowNode = rowNode.parent;
            labels.push(rowNode.key);
        }
        return labels;
    };
    __decorate([
        grid_core_1.Autowired('rowModel')
    ], ChartDatasource.prototype, "gridRowModel", void 0);
    __decorate([
        grid_core_1.Autowired('valueService')
    ], ChartDatasource.prototype, "valueService", void 0);
    __decorate([
        grid_core_1.Optional('aggregationStage')
    ], ChartDatasource.prototype, "aggregationStage", void 0);
    __decorate([
        grid_core_1.Autowired('columnController')
    ], ChartDatasource.prototype, "columnController", void 0);
    return ChartDatasource;
}(grid_core_1.BeanStub));
exports.ChartDatasource = ChartDatasource;