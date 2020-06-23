package data;

import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Chart;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Drawing;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.PresetColor;
import org.apache.poi.xddf.usermodel.XDDFColor;
import org.apache.poi.xddf.usermodel.XDDFShapeProperties;
import org.apache.poi.xddf.usermodel.XDDFSolidFillProperties;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.BarDirection;
import org.apache.poi.xddf.usermodel.chart.BarGrouping;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.LegendPosition;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFChartLegend;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFNumericalDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.streaming.SXSSFDrawing;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.XLSUtilities;
import org.smap.sdal.managers.LogManager;
import org.smap.sdal.model.Form;

import model.DailyReportsConfig;
import model.ReportColumn;
import model.ReportMultiColumn;

public class DailyReportsManager {

	private static Logger log =
			Logger.getLogger(DailyReportsManager.class.getName());

	LogManager lm = new LogManager();		// Application log
	
	private ResourceBundle localisation = null;
	private String tz;
	
	private class ChartItem {
		String theDate;
		Row dateRow;
		ArrayList<Integer> bars = new ArrayList<> ();
	}
	private ArrayList<Row> chartDataRows = new ArrayList<> ();

	public DailyReportsManager(ResourceBundle l, String tz) {
		localisation = l;
		if(tz == null) {
			tz = "UTC";
		}
		this.tz = tz;
	}

	public void getDailyReport(
			Connection sd, 
			Connection cResults, 
			HttpServletResponse response,
			String filename,
			DailyReportsConfig config, 
			int year, 
			int month) throws SQLException, ApplicationException {

		PreparedStatement pstmt = null;
		ResultSet rs = null;
		
		XSSFWorkbook wb = null;
		XSSFSheet sheet = null;
		
		int rowNumber = 0;
		CellStyle errorStyle = null;
		
		try {
			int sId = GeneralUtilityMethods.getSurveyId(sd, config.sIdent);
			Form tlf = GeneralUtilityMethods.getTopLevelForm(sd, sId);
			String surveyName = GeneralUtilityMethods.getSurveyName(sd, sId);
	
			String escapedFileName = null;
			try {
				escapedFileName = URLDecoder.decode(filename, "UTF-8");
				escapedFileName = URLEncoder.encode(escapedFileName, "UTF-8");
			} catch (UnsupportedEncodingException e1) {
				e1.printStackTrace();
			}

			escapedFileName = escapedFileName.replace("+", " "); // Spaces ok for file name within quotes
			escapedFileName = escapedFileName.replace("%2C", ","); // Commas ok for file name within quotes
			GeneralUtilityMethods.setFilenameInResponse(escapedFileName + "." + "xlsx", response); // Set file name
			
			/*
			 * Validate report configuration
			 * This is required for security as much as error reporting
			 * TODO for all columns
			 */
			if(!GeneralUtilityMethods.hasColumn(cResults, tlf.tableName, config.dateColumn)) {
				String msg = localisation.getString("qnf").replace("%s1", config.dateColumn).replace("%s2", surveyName);
				throw new ApplicationException(msg);
			}
	
			/*
			 * Create query
			 */
			StringBuilder sb = new StringBuilder("select ");
			int idx = 0;
			for(ReportColumn rc : config.columns) {
				if(idx++ > 0) {
					sb.append(",");
				}
				sb.append(rc.column);
			}
	
			for(ReportMultiColumn bar : config.bars) {
				sb.append(",");
				idx = 0;
				for(String name : bar.columns) {
					if(idx++ > 0) {
						sb.append(" + ");
					}
					sb.append(name);
				}
				sb.append(" as ").append(bar.name);
			}
	
			sb.append(" from ").append(tlf.tableName);
	
			
			wb = new XSSFWorkbook();
			Map<String, CellStyle> styles = XLSUtilities.createStyles(wb);
			CellStyle headerStyle = styles.get("header");
			errorStyle = styles.get("error");
					
			sheet = wb.createSheet();
			
			// page the results to reduce memory usage
			pstmt = cResults.prepareStatement(sb.toString());
			cResults.setAutoCommit(false);		
			pstmt.setFetchSize(100);	
			
			log.info("Get dairly report data: " + pstmt.toString());
			rs = pstmt.executeQuery();
			
			/*
			 * Write the title
			 * TODO
			 */
			
			/*
			 * Write the header
			 */
			int colNumber = 0;
			Row headerRow = sheet.createRow(rowNumber++);	
			for (ReportColumn rc : config.columns) {
				Cell cell = headerRow.createCell(colNumber++);
				cell.setCellStyle(headerStyle);
				cell.setCellValue(rc.heading);
			}
			
			/*
			 * Write the data rows and accumulate the chart data
			 */
			ArrayList<ChartItem> chartItems = new ArrayList<> ();
			while(rs.next()) {
				colNumber = 0;
				Row row = sheet.createRow(rowNumber++);	
				for (ReportColumn rc : config.columns) {
					Cell cell = row.createCell(colNumber++);
					cell.setCellValue(rs.getString(rc.column));
				}
				ChartItem item = new ChartItem();
				item.theDate = rs.getString(config.dateColumn);
				for(ReportMultiColumn rmc : config.bars) {
					item.bars.add(rs.getInt(rmc.name));
				}
				chartItems.add(item);				
			}
			
			/*
			 * Write the chart data
			 */
			rowNumber++;
			int chartDataRow = rowNumber;
			colNumber = 0;
			for(ChartItem item : chartItems) {
				Row row = getChartRow(chartDataRows, sheet, chartDataRow, 0);
				Cell cell = row.createCell(colNumber + 1);
				cell.setCellValue(item.theDate);
				
				if(colNumber == 0) {
					cell = row.createCell(colNumber);
					cell.setCellValue("Date");
				}
				
				for(int i = 0; i < item.bars.size(); i++) {
					row = getChartRow(chartDataRows, sheet, chartDataRow, i + 1);
					cell = row.createCell(colNumber + 1);
					cell.setCellValue(item.bars.get(i));
					
					if(colNumber == 0) {
						cell = row.createCell(colNumber);
						cell.setCellValue(config.bars.get(i).title);
					}
				}
				colNumber++;
			}
			rowNumber += 1 + config.bars.size();
			
			/*
			 * Create the chart
			 */
			int startRow = rowNumber++;
			int endRow = startRow + 10;
			int endCol = chartItems.size();
			XSSFDrawing drawing = sheet.createDrawingPatriarch();
			ClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 0, startRow, endCol, endRow);
			XSSFChart chart = drawing.createChart(anchor);
			
			chart.setTitleText("Chart Title");
			chart.setTitleOverlay(false);			
			XDDFChartLegend legend = chart.getOrAddLegend();
			legend.setPosition(LegendPosition.TOP_RIGHT);
			
			XDDFCategoryAxis bottomAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
			bottomAxis.setTitle("Date");
			XDDFValueAxis leftAxis = chart.createValueAxis(AxisPosition.LEFT);
			leftAxis.setTitle("Count");
			 
			XDDFDataSource<String> xs = XDDFDataSourcesFactory.fromStringCellRange(sheet,
					new CellRangeAddress(chartDataRow, chartDataRow, 1, chartItems.size() + 1));

			XDDFNumericalDataSource<Double> ys1 = XDDFDataSourcesFactory.fromNumericCellRange(sheet,
					new CellRangeAddress(chartDataRow + 1, chartDataRow + 1, 1, chartItems.size() + 1));
			 
			XDDFBarChartData data = (XDDFBarChartData) chart.createData(ChartTypes.BAR, bottomAxis, leftAxis);
			
			XDDFChartData.Series series1 = data.addSeries(xs, ys1);
	        series1.setTitle("xxxx", null); 
	          
	        XDDFBarChartData bar = (XDDFBarChartData) data;
            bar.setBarDirection(BarDirection.COL);
            bar.setBarGrouping(BarGrouping.STACKED);

            solidFillSeries(data, 0, PresetColor.CHARTREUSE);
            //solidFillSeries(data, 1, PresetColor.TURQUOISE);
            
	        chart.plot(data);
			
			cResults.setAutoCommit(true);		// End paging
			
		} catch(Exception e) {
			log.log(Level.SEVERE, e.getMessage(), e);
			try {cResults.setAutoCommit(true);} catch(Exception ex) {};
			
			String msg = e.getMessage();
			if(msg.contains("does not exist")) {
				msg = localisation.getString("msg_no_data");
			}
			Row dataRow = sheet.createRow(rowNumber + 10);	
			Cell cell = dataRow.createCell(0);
			cell.setCellStyle(errorStyle);
			cell.setCellValue(msg);
			
		} finally {
			
			try {
				OutputStream outputStream = response.getOutputStream();
				wb.write(outputStream);
				wb.close();
				outputStream.close();
			} catch (Exception ex) {
				log.log(Level.SEVERE, "Error", ex);
			}
			
			if(rs != null) {try {rs.close();} catch(Exception ex) {}} 
			if(pstmt != null) {try {pstmt.close();} catch(Exception ex) {}} 
		}

	}
	
	private Row getChartRow(ArrayList<Row> chartDataRows, Sheet sheet, int baseRowNumber, int idx) {
		Row row = null;
		if(chartDataRows.size() > idx) {
			row = chartDataRows.get(idx);
		} else {
			row = sheet.createRow(baseRowNumber + idx);	
			chartDataRows.add(row);
		}
		return row;
	}
	
	private static void solidFillSeries(XDDFChartData data, int index, PresetColor color) {
        XDDFSolidFillProperties fill = new XDDFSolidFillProperties(XDDFColor.from(color));
        XDDFChartData.Series series = data.getSeries().get(index);
        XDDFShapeProperties properties = series.getShapeProperties();
        if (properties == null) {
            properties = new XDDFShapeProperties();
        }
        properties.setFillProperties(fill);
        series.setShapeProperties(properties);
    }
}
